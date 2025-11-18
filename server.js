import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Enable CORS for the Vite dev server (allow any port on localhost and network)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost on any port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow network IP on any port
    if (origin.startsWith('http://192.168.68.153:')) {
      return callback(null, true);
    }

    // Allow Vercel production domains
    if (origin === 'https://icannoah.vercel.app' ||
        origin === 'https://teacher-availability-poll.vercel.app' ||
        origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint to fetch teachers from Notion
app.get('/api/teachers', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_TEACHERS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials'
      });
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          select: {
            equals: 'Active'
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Notion API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    const teachers = data.results.map((page) => {
      const properties = page.properties;

      let fullName = 'Unknown';
      if (properties['Full Name']) {
        if (properties['Full Name'].type === 'title' && properties['Full Name'].title.length > 0) {
          fullName = properties['Full Name'].title[0].plain_text;
        } else if (properties['Full Name'].type === 'rich_text' && properties['Full Name'].rich_text.length > 0) {
          fullName = properties['Full Name'].rich_text[0].plain_text;
        }
      }

      return {
        id: page.id,
        name: fullName
      };
    });

    // Sort alphabetically
    teachers.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Successfully loaded ${teachers.length} active teachers from Notion`);
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      error: 'Failed to fetch teachers',
      details: error.message
    });
  }
});

// Endpoint to upload files (photo or video)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const hostname = req.hostname === 'localhost' ? 'localhost' : req.hostname;
    const fileUrl = `http://${hostname}:${PORT}/uploads/${req.file.filename}`;

    console.log(`✅ File uploaded: ${req.file.filename}`);
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error.message
    });
  }
});

// Endpoint to create a submission in Notion
app.post('/api/submissions', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_SUBMISSIONS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials for submissions'
      });
    }

    const { teacherId, teacherName, status, coords, locationName, reason, timestamp, photoUrl, videoUrl } = req.body;

    // Build properties object
    const properties = {
      'Teacher Name': {
        title: [{ text: { content: teacherName || 'Unknown' } }]
      },
      'Status': {
        select: { name: status }
      },
      'Reason': {
        rich_text: [{ text: { content: reason || '' } }]
      },
      'Location': {
        rich_text: [{ text: { content: locationName || 'Unknown Location' } }]
      },
      'Coordinates': {
        rich_text: [{ text: { content: coords ? `${coords.lat}, ${coords.lng}` : '' } }]
      },
      'Timestamp': {
        date: { start: new Date(timestamp).toISOString() }
      },
      'Teacher ID': {
        rich_text: [{ text: { content: teacherId } }]
      }
    };

    // Add photo if provided
    if (photoUrl) {
      properties['Photo'] = {
        files: [{ name: 'Photo', external: { url: photoUrl } }]
      };
    }

    // Add video if provided
    if (videoUrl) {
      properties['Video'] = {
        files: [{ name: 'Video', external: { url: videoUrl } }]
      };
    }

    // Create page in Notion submissions database
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Notion API error when creating submission:');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      console.error('Submitted data:', JSON.stringify({ teacherId, teacherName, status, coords, reason, timestamp }, null, 2));
      return res.status(response.status).json({
        error: `Notion API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log(`✅ Successfully saved submission for teacher: ${teacherName}`);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({
      error: 'Failed to save submission',
      details: error.message
    });
  }
});

// Endpoint to fetch all submissions from Notion
app.get('/api/submissions', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_SUBMISSIONS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials for submissions'
      });
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Remove sorts for now - will add back once we know the exact property name
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Notion API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    const submissions = data.results.map((page) => {
      const properties = page.properties;

      return {
        id: page.id,
        teacherId: properties['Teacher ID']?.rich_text?.[0]?.plain_text || '',
        teacherName: properties['Teacher Name']?.title?.[0]?.plain_text || 'Unknown',
        status: properties['Status']?.select?.name || '',
        reason: properties['Reason']?.rich_text?.[0]?.plain_text || '',
        location: properties['Location']?.rich_text?.[0]?.plain_text || '',
        coordinates: properties['Coordinates']?.rich_text?.[0]?.plain_text || '',
        timestamp: properties['Timestamp']?.date?.start || new Date().toISOString()
      };
    });

    console.log(`✅ Successfully loaded ${submissions.length} submissions from Notion`);
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      error: 'Failed to fetch submissions',
      details: error.message
    });
  }
});

// Endpoint to delete ALL submissions from Notion (DESTRUCTIVE!)
app.delete('/api/submissions', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_SUBMISSIONS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials'
      });
    }

    // Fetch all submissions
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Notion API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    let deletedCount = 0;
    let failedCount = 0;

    // Archive (delete) each submission
    for (const page of data.results) {
      const deleteResponse = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: true  // Notion doesn't have delete, only archive
        })
      });

      if (deleteResponse.ok) {
        deletedCount++;
        console.log(`🗑️  Archived submission ${page.id}`);
      } else {
        failedCount++;
        const errorText = await deleteResponse.text();
        console.error(`❌ Failed to archive submission ${page.id}:`, errorText);
      }
    }

    console.log(`✅ Deletion complete: ${deletedCount} archived, ${failedCount} failed`);
    res.json({
      success: true,
      deletedCount,
      failedCount,
      totalProcessed: data.results.length
    });
  } catch (error) {
    console.error('Error deleting submissions:', error);
    res.status(500).json({
      error: 'Failed to delete submissions',
      details: error.message
    });
  }
});

// Migration endpoint to fix old submissions
app.post('/api/migrate-submissions', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_SUBMISSIONS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials'
      });
    }

    // Fetch all submissions
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Notion API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    let updatedCount = 0;
    let skippedCount = 0;

    // Helper to check if a string is coordinates
    const isCoordinateString = (str) => {
      if (!str) return false;
      const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
      return coordPattern.test(str.trim());
    };

    // Update each submission that has coordinates in Location field
    for (const page of data.results) {
      const properties = page.properties;
      const locationValue = properties['Location']?.rich_text?.[0]?.plain_text || '';
      const coordinatesValue = properties['Coordinates']?.rich_text?.[0]?.plain_text || '';

      // Only update if Location contains coordinates and Coordinates is empty
      if (locationValue && isCoordinateString(locationValue) && !coordinatesValue) {
        console.log(`🔄 Migrating page ${page.id}: "${locationValue}"`);

        const updateResponse = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              'Location': {
                rich_text: [{ text: { content: 'Location not specified (old data)' } }]
              },
              'Coordinates': {
                rich_text: [{ text: { content: locationValue } }]
              }
            }
          })
        });

        if (updateResponse.ok) {
          updatedCount++;
          console.log(`✅ Updated page ${page.id}`);
        } else {
          const errorText = await updateResponse.text();
          console.error(`❌ Failed to update page ${page.id}:`, errorText);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Migration complete: ${updatedCount} updated, ${skippedCount} skipped`);
    res.json({
      success: true,
      updatedCount,
      skippedCount,
      totalProcessed: data.results.length
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({
      error: 'Migration failed',
      details: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Network: http://192.168.68.153:${PORT}`);
  console.log(`📚 Teachers API available at http://localhost:${PORT}/api/teachers`);
  console.log(`📝 Submissions API available at http://localhost:${PORT}/api/submissions`);
  console.log(`🔧 Migration endpoint available at http://localhost:${PORT}/api/migrate-submissions (POST)`);
});
