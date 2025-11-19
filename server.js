import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'teacher-availability-poll',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
    resource_type: 'auto', // Automatically detect image vs video
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

    // Cloudinary provides the file URL in req.file.path
    const fileUrl = req.file.path;

    console.log(`✅ File uploaded to Cloudinary: ${fileUrl}`);
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

      // Extract photo URL if it exists
      const photoUrl = properties['Photo']?.files?.[0]?.external?.url ||
                       properties['Photo']?.files?.[0]?.file?.url || '';

      // Extract video URL if it exists
      const videoUrl = properties['Video']?.files?.[0]?.external?.url ||
                       properties['Video']?.files?.[0]?.file?.url || '';

      return {
        id: page.id,
        teacherId: properties['Teacher ID']?.rich_text?.[0]?.plain_text || '',
        teacherName: properties['Teacher Name']?.title?.[0]?.plain_text || 'Unknown',
        status: properties['Status']?.select?.name || '',
        reason: properties['Reason']?.rich_text?.[0]?.plain_text || '',
        location: properties['Location']?.rich_text?.[0]?.plain_text || '',
        coordinates: properties['Coordinates']?.rich_text?.[0]?.plain_text || '',
        timestamp: properties['Timestamp']?.date?.start || new Date().toISOString(),
        photoUrl: photoUrl || undefined,
        videoUrl: videoUrl || undefined
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

// GET /api/teachers-schedules - Fetch teachers with their schedules (Start Time, End Time)
app.get('/api/teachers-schedules', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_TEACHERS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials'
      });
    }

    // Use Notion's server-side filter for Active status (same as /api/teachers)
    // This is critical because Notion pagination returns only first 100 results
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
      return {
        id: page.id, // Use page.id to match /api/teachers endpoint
        name: properties['Full Name']?.title?.[0]?.plain_text || 'Unknown',
        startTime: properties['Start Time']?.select?.name || '',
        endTime: properties['End Time']?.select?.name || '',
      };
    });

    console.log(`✅ Successfully loaded ${teachers.length} active teachers from Notion (filtered by Notion API)`);
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers schedules:', error);
    res.status(500).json({
      error: 'Failed to fetch teachers schedules',
      details: error.message
    });
  }
});

// DEBUG: GET /api/teachers-debug - Show all teachers with their raw status values
app.get('/api/teachers-debug', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_TEACHERS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({ error: 'Missing credentials' });
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    const teachers = data.results.map((page) => {
      const properties = page.properties;

      // Get raw status value
      let status = '';
      let statusType = 'unknown';
      const statusProp = properties['Status'];
      if (statusProp) {
        statusType = statusProp.type;
        if (statusProp.select) {
          status = statusProp.select?.name || '';
        } else if (statusProp.rich_text && statusProp.rich_text.length > 0) {
          status = statusProp.rich_text[0].plain_text || '';
        } else if (statusProp.title && statusProp.title.length > 0) {
          status = statusProp.title[0].plain_text || '';
        }
      }

      return {
        id: page.id,
        name: properties['Full Name']?.title?.[0]?.plain_text || 'Unknown',
        status: status,
        statusType: statusType,
        statusRaw: JSON.stringify(statusProp),
        startTime: properties['Start Time']?.select?.name || '',
        endTime: properties['End Time']?.select?.name || '',
      };
    });

    // Find Edward specifically
    const edward = teachers.filter(t => t.name.toLowerCase().includes('edward'));

    res.json({
      total: teachers.length,
      edward: edward,
      allStatuses: [...new Set(teachers.map(t => `"${t.status}" (${t.statusType})`))],
      teachers: teachers.map(t => ({ name: t.name, status: t.status, statusType: t.statusType }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students - Fetch ALL students with pagination support
app.get('/api/students', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_STUDENTS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials'
      });
    }

    let allStudents = [];
    let hasMore = true;
    let startCursor = undefined;

    // Fetch all pages until no more results
    while (hasMore) {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_cursor: startCursor,
          page_size: 100
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
      const students = data.results.map((page) => {
        const properties = page.properties;
        return {
          id: page.id,
          name: properties['Full Name']?.title?.[0]?.plain_text || 'Unknown',
          startTime: properties['Start Time']?.select?.name || '',
          endTime: properties['End Time']?.select?.name || '',
          grade: properties['Grade']?.rich_text?.[0]?.plain_text || '',
          status: properties['Status']?.select?.name || 'Active',
        };
      });

      allStudents = allStudents.concat(students);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    console.log(`✅ Successfully loaded ${allStudents.length} students from Notion (${allStudents.filter(s => s.status === 'Active').length} active)`);
    res.json(allStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      details: error.message
    });
  }
});

// DEBUG: Get raw student data from Notion
app.get('/api/students-debug', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_STUDENTS_DB_ID;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 1 })
    });

    const data = await response.json();
    // Return just the first result's properties to see structure
    if (data.results && data.results.length > 0) {
      res.json({
        propertyNames: Object.keys(data.results[0].properties),
        firstRecord: data.results[0].properties
      });
    } else {
      res.json({ error: 'No records found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get raw teacher data from Notion
app.get('/api/teachers-debug', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_TEACHERS_DB_ID;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 1 })
    });

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      res.json({
        propertyNames: Object.keys(data.results[0].properties),
        firstRecord: data.results[0].properties
      });
    } else {
      res.json({ error: 'No records found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lesson-plans - Save a lesson plan to Notion
app.post('/api/lesson-plans', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_LESSON_PLANS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials or NOTION_LESSON_PLANS_DB_ID'
      });
    }

    const {
      date,
      shift,
      teacherName,
      teacherId,
      students, // Array of {name, grade}
      lessonPlan, // The full GeneratedLessonPlan object
      isOnline
    } = req.body;

    // Create a unique key for this lesson plan (teacher + shift + date)
    const planKey = `${teacherId}-${shift}-${date}`;

    // Format students as text
    const studentsText = students.map((s, i) => `${i + 1}. ${s.name} (Grade ${s.grade})`).join('\n');

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          'Title': {
            title: [{ text: { content: lessonPlan.title } }]
          },
          'Date': {
            date: { start: date }
          },
          'Shift': {
            select: { name: shift }
          },
          'Teacher Name': {
            rich_text: [{ text: { content: teacherName } }]
          },
          'Teacher ID': {
            rich_text: [{ text: { content: teacherId } }]
          },
          'Students': {
            rich_text: [{ text: { content: studentsText } }]
          },
          'Student Count': {
            number: students.length
          },
          'Delivery Mode': {
            select: { name: isOnline ? 'Online' : 'In-Person' }
          },
          'Plan Key': {
            rich_text: [{ text: { content: planKey } }]
          },
          'Lesson Plan JSON': {
            rich_text: [{ text: { content: JSON.stringify(lessonPlan) } }]
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Notion API error:', error);
      return res.status(response.status).json({ error: error.message || 'Failed to save lesson plan' });
    }

    const data = await response.json();
    res.json({ success: true, pageId: data.id, planKey });
  } catch (error) {
    console.error('Error saving lesson plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lesson-plans - Get lesson plans for a specific date
app.get('/api/lesson-plans', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_LESSON_PLANS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials or NOTION_LESSON_PLANS_DB_ID'
      });
    }

    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Date',
          date: {
            equals: targetDate
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Notion API error:', error);
      return res.status(response.status).json({ error: error.message || 'Failed to fetch lesson plans' });
    }

    const data = await response.json();

    // Parse the results into a more usable format
    const lessonPlans = data.results.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        title: props['Title']?.title?.[0]?.plain_text || '',
        date: props['Date']?.date?.start || '',
        shift: props['Shift']?.select?.name || '',
        teacherName: props['Teacher Name']?.rich_text?.[0]?.plain_text || '',
        teacherId: props['Teacher ID']?.rich_text?.[0]?.plain_text || '',
        studentCount: props['Student Count']?.number || 0,
        deliveryMode: props['Delivery Mode']?.select?.name || '',
        planKey: props['Plan Key']?.rich_text?.[0]?.plain_text || '',
        lessonPlan: JSON.parse(props['Lesson Plan JSON']?.rich_text?.[0]?.plain_text || '{}')
      };
    });

    res.json(lessonPlans);
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lesson-plans/:planKey - Get a specific lesson plan by its key
app.get('/api/lesson-plans/:planKey', async (req, res) => {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_LESSON_PLANS_DB_ID;

    if (!apiKey || !databaseId) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Notion credentials or NOTION_LESSON_PLANS_DB_ID'
      });
    }

    const { planKey } = req.params;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Plan Key',
          rich_text: {
            equals: planKey
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message });
    }

    const data = await response.json();

    if (data.results.length === 0) {
      return res.status(404).json({ error: 'Lesson plan not found' });
    }

    // Return the most recent one if there are multiple
    const page = data.results[0];
    const props = page.properties;

    res.json({
      id: page.id,
      title: props['Title']?.title?.[0]?.plain_text || '',
      date: props['Date']?.date?.start || '',
      shift: props['Shift']?.select?.name || '',
      teacherName: props['Teacher Name']?.rich_text?.[0]?.plain_text || '',
      teacherId: props['Teacher ID']?.rich_text?.[0]?.plain_text || '',
      studentCount: props['Student Count']?.number || 0,
      deliveryMode: props['Delivery Mode']?.select?.name || '',
      planKey: props['Plan Key']?.rich_text?.[0]?.plain_text || '',
      lessonPlan: JSON.parse(props['Lesson Plan JSON']?.rich_text?.[0]?.plain_text || '{}')
    });
  } catch (error) {
    console.error('Error fetching lesson plan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Network: http://192.168.68.153:${PORT}`);
  console.log(`📚 Teachers API available at http://localhost:${PORT}/api/teachers`);
  console.log(`👨‍🏫 Teachers Schedules API available at http://localhost:${PORT}/api/teachers-schedules`);
  console.log(`👦 Students API available at http://localhost:${PORT}/api/students`);
  console.log(`📝 Submissions API available at http://localhost:${PORT}/api/submissions`);
  console.log(`📖 Lesson Plans API available at http://localhost:${PORT}/api/lesson-plans`);
  console.log(`🔧 Migration endpoint available at http://localhost:${PORT}/api/migrate-submissions (POST)`);
});
