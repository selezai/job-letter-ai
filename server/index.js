const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fileUpload = require('express-fileupload');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET);
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Debug startup information
console.log('Starting server...');
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Available environment variables:', Object.keys(process.env));

// Ensure we use Render's PORT
const PORT = process.env.PORT || 3000;
console.log('Using PORT:', PORT);

// Debug port
console.log('Server attempting to start on port:', PORT);
console.log('Environment:', process.env.NODE_ENV);

// Initialize OpenAI
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is missing');
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Paystack
if (!process.env.PAYSTACK_SECRET) {
    console.error('PAYSTACK_SECRET is missing');
}

// Debug environment variables
console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Present' : 'Missing');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Present' : 'Missing');
console.log('PAYSTACK_SECRET:', process.env.PAYSTACK_SECRET ? 'Present' : 'Missing');
console.log('CALLBACK_URL:', process.env.CALLBACK_URL || 'Missing');
console.log('PORT:', process.env.PORT || '3000 (default)');

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Please check your .env file.');
  }
  
  // Initialize Supabase clients
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey); // Service role for admin operations
  const supabasePublic = createClient(
    supabaseUrl,
    process.env.SUPABASE_ANON_KEY || supabaseKey // Fallback to service role if anon key not set
  );
  
  const app = express();

  // API routes first
  app.get('/api', (req, res) => {
      console.log('API endpoint hit');
      res.json({ message: 'Letter AI API is running' });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
  });

  // Test endpoint for environment variables
  app.get('/test-env', (req, res) => {
      console.log('Test-env endpoint hit');
      try {
          const envStatus = {
              supabase_url: !!process.env.SUPABASE_URL,
              supabase_key: !!process.env.SUPABASE_KEY,
              anthropic_key: !!process.env.ANTHROPIC_API_KEY,
              paystack_secret: !!process.env.PAYSTACK_SECRET,
              callback_url: !!process.env.CALLBACK_URL,
              port: process.env.PORT || '3000 (default)'
          };
          
          // Log the actual environment variables for debugging
          console.log('Environment Variables Check:');
          console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
          console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Present' : 'Missing');
          console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Present' : 'Missing');
          console.log('PAYSTACK_SECRET:', process.env.PAYSTACK_SECRET ? 'Present' : 'Missing');
          console.log('CALLBACK_URL:', process.env.CALLBACK_URL ? 'Present' : 'Missing');
          console.log('PORT:', process.env.PORT || '3000 (default)');
          
          res.json({
              message: 'Environment Variable Status',
              status: envStatus,
              node_env: process.env.NODE_ENV || 'not set'
          });
      } catch (error) {
          console.error('Error in test-env endpoint:', error);
          res.status(500).json({
              error: 'Failed to check environment variables',
              details: error.message
          });
      }
  });

  // Basic middleware
  app.use(express.json());
  app.use(fileUpload());

  // Request logging
  app.use((req, res, next) => {
      console.log('Request received:', req.method, req.url);
      next();
  });

  // Serve static files
  const publicPath = path.join(__dirname, 'public');
  console.log('Serving static files from:', publicPath);
  app.use(express.static(publicPath));

  // Home route
  app.get('/', (req, res) => {
      console.log('Home route hit');
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Constants
  const LETTER_PRICE = 499; // R4.99 in cents

  // Helper function to get or create user
  async function getOrCreateUser(email) {
      const { data: existingUser, error: fetchError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
      }

      if (existingUser) {
          return existingUser;
      }

      const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert([{ email, free_letters_remaining: 1 }])
          .select()
          .single();

      if (createError) {
          throw createError;
      }

      return newUser;
  }

  // Helper function to generate letter content
  async function generateLetterContent(cvContent, jobDescription, letterType) {
      try {
          console.log('Generating letter with Claude...');
          console.log('Using API key:', process.env.ANTHROPIC_API_KEY ? 'Present' : 'Missing');
          
          const prompt = `As a professional resume writer, create a ${letterType === 'cover_letter' ? 'cover letter' : 'motivation letter'} based on the following:

CV/Resume:
${cvContent}

Job Description:
${jobDescription}

Requirements:
1. Keep the tone professional and enthusiastic
2. Highlight relevant experience and skills from the CV that match the job description
3. Show genuine interest in the role and company
4. Keep it concise (max 400 words)
5. Format with proper paragraph breaks
${letterType === 'cover_letter' ? '6. Focus on how your experience matches the job requirements' : '6. Focus on your personal motivation and career goals'}

Please write the letter in a clear, modern business format.`;

          const message = await anthropic.messages.create({
              model: "claude-2.1",
              max_tokens: 1000,
              temperature: 0.7,
              messages: [
                  {
                      role: "user",
                      content: prompt
                  }
              ]
          });

          console.log('Claude response received');
          return message.content[0].text;
      } catch (error) {
          console.error('Claude API error details:', error);
          throw new Error(`Claude API error: ${error.message}`);
      }
  }

  // Upload document endpoint
  app.post('/upload', async (req, res) => {
      try {
          if (!req.files || !req.files.file) {
              return res.status(400).json({ error: 'No file uploaded' });
          }

          const file = req.files.file;
          const userId = req.body.user_id;
          const documentType = req.body.document_type;
          const fileName = file.name;

          // Validate document type
          if (!['cv', 'job_description'].includes(documentType)) {
              return res.status(400).json({ error: 'Invalid document type' });
          }

          // Validate file type
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
          if (!allowedTypes.includes(file.mimetype)) {
              return res.status(400).json({ 
                  error: 'Invalid file type. Please upload a PDF or image file.' 
              });
          }

          console.log('Attempting to upload file to Supabase Storage...');
          
          const { data: fileData, error: uploadError } = await supabaseAdmin
              .storage
              .from('documents')
              .upload(`${userId}/${documentType}/${fileName}`, file.data, {
                  contentType: file.mimetype,
                  upsert: true
              });

          if (uploadError) {
              console.error('File upload failed:', uploadError);
              return res.status(500).json({ 
                  error: 'Failed to upload file',
                  details: uploadError.message 
              });
          }

          console.log('File uploaded successfully to storage:', fileData);

          const { data: urlData } = supabaseAdmin
              .storage
              .from('documents')
              .getPublicUrl(`${userId}/${documentType}/${fileName}`);

          const publicUrl = urlData.publicUrl;
          console.log('Generated public URL:', publicUrl);

          const { data: metaData, error: dbError } = await supabaseAdmin
              .from('uploads')
              .insert({
                  filename: fileName,
                  user_id: userId,
                  file_size: file.size,
                  document_type: documentType,
                  file_type: file.mimetype,
                  original_filename: fileName
              })
              .select();

          if (dbError) {
              console.error('Database insert failed:', dbError);
              return res.status(500).json({ 
                  error: 'Failed to save file metadata',
                  details: dbError.message 
              });
          }

          res.json({ 
              success: true, 
              data: metaData,
              fileUrl: publicUrl
          });

      } catch (error) {
          console.error('Upload error:', error);
          res.status(500).json({ 
              error: 'Internal server error',
              details: error.message 
          });
      }
  });

  // Initialize payment endpoint
  app.post('/initialize-payment', async (req, res) => {
      try {
          const { email } = req.body;
          if (!email) {
              return res.status(400).json({ error: 'Email is required' });
          }

          // Get or create user
          const user = await getOrCreateUser(email);

          // Check for free tier eligibility
          if (user.free_letters_remaining > 0) {
              return res.json({ 
                  status: 'success',
                  free_tier: true,
                  message: 'You have a free letter available!' 
              });
          }

          console.log('Initializing payment for email:', email);
          console.log('Sending payment initialization request to Paystack...');

          const response = await Paystack.transaction.initialize({
              email,
              amount: LETTER_PRICE, // R4.99
              currency: 'ZAR',
              callback_url: process.env.CALLBACK_URL,
              metadata: {
                  user_id: user.id
              }
          });

          console.log('Payment initialized successfully:', response.data);
          res.json({
              status: 'success',
              url: response.data.authorization_url,
              reference: response.data.reference
          });

      } catch (error) {
          console.error('Payment initialization failed:', error);
          res.status(500).json({ 
              error: 'Failed to initialize payment',
              details: error.message 
          });
      }
  });

  // Verify payment endpoint
  app.get('/verify-payment', async (req, res) => {
      const reference = req.query.reference;
      console.log('Verifying payment for reference:', reference);

      if (!reference) {
          console.error('Payment verification failed: No reference provided');
          return res.status(400).json({ 
              error: 'Payment reference is required',
              status: 'error'
          });
      }

      try {
          console.log('Sending verification request to Paystack...');
          const response = await Paystack.transaction.verify({ reference });
          console.log('Payment verification response:', response.data);

          if (response.data.status === 'success') {
              // Update user's payment status
              const { data: letterRecord, error: dbError } = await supabaseAdmin
                  .from('generated_letters')
                  .update({
                      payment_status: 'completed'
                  })
                  .eq('payment_reference', reference)
                  .select();

              if (dbError) {
                  console.error('Failed to update payment status:', dbError);
              }

              res.json({ 
                  status: 'success',
                  message: 'Payment verified successfully'
              });
          } else {
              console.log('Payment not successful:', response.data.gateway_response);
              res.json({ 
                  status: 'failed',
                  message: 'Payment not successful',
                  details: response.data.gateway_response
              });
          }
      } catch (error) {
          console.error('Payment verification failed:', error);
          res.status(500).json({ 
              error: 'Failed to verify payment',
              details: error.message,
              status: 'error'
          });
      }
  });

  // Generate letter endpoint
  app.post('/generate-letter', async (req, res) => {
      try {
          const { userId, letterType, cvId, jobDescId } = req.body;

          // Validate inputs
          if (!userId || !letterType || !cvId || !jobDescId) {
              return res.status(400).json({ 
                  error: 'Missing required fields' 
              });
          }

          // Validate letter type
          if (!['cover_letter', 'motivation_letter'].includes(letterType)) {
              return res.status(400).json({ 
                  error: 'Invalid letter type' 
              });
          }

          // Get user details
          const { data: user, error: userError } = await supabaseAdmin
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

          if (userError) {
              throw userError;
          }

          // Get CV file
          const { data: cvFile } = await supabaseAdmin
              .storage
              .from('documents')
              .download(`${userId}/cv/${cvId}`);

          if (!cvFile) {
              throw new Error('CV file not found');
          }

          // Get job description file
          const { data: jobFile } = await supabaseAdmin
              .storage
              .from('documents')
              .download(`${userId}/job_description/${jobDescId}`);

          if (!jobFile) {
              throw new Error('Job description file not found');
          }

          // Convert files to text
          const cvContent = await cvFile.text();
          const jobDescription = await jobFile.text();

          // Generate letter content using Claude
          const generatedContent = await generateLetterContent(
              cvContent,
              jobDescription,
              letterType
          );

          // Create letter record
          const { data: letter, error: letterError } = await supabaseAdmin
              .from('generated_letters')
              .insert({
                  user_id: userId,
                  letter_type: letterType,
                  cv_upload_id: cvId,
                  job_desc_upload_id: jobDescId,
                  content: generatedContent,
                  payment_status: user.free_letters_remaining > 0 ? 'completed' : 'pending'
              })
              .select()
              .single();

          if (letterError) {
              throw letterError;
          }

          // If using free tier, decrease the count
          if (user.free_letters_remaining > 0) {
              await supabaseAdmin
                  .from('users')
                  .update({ free_letters_remaining: user.free_letters_remaining - 1 })
                  .eq('id', userId);
          }

          res.json({ 
              success: true, 
              data: letter 
          });

      } catch (error) {
          console.error('Letter generation error:', error);
          res.status(500).json({ 
              error: 'Failed to generate letter',
              details: error.message 
          });
      }
  });

  // Test endpoint for letter generation
  app.post('/test-letter-generation', async (req, res) => {
      try {
          // Create a test user with unique email
          const testEmail = `test${Date.now()}@example.com`;
          const { data: user, error: userError } = await supabaseAdmin
              .from('users')
              .insert({
                  email: testEmail,
                  free_letters_remaining: 1
              })
              .select()
              .single();

          if (userError) {
              throw userError;
          }

          // Sample CV content
          const cvContent = `PROFESSIONAL SUMMARY
Experienced software developer with 5 years of experience in full-stack development.
Proficient in JavaScript, Node.js, and React. Strong problem-solving skills and team collaboration.

WORK EXPERIENCE
Senior Developer, Tech Corp (2020-Present)
- Led development of customer-facing web applications
- Implemented CI/CD pipelines reducing deployment time by 50%
- Mentored junior developers and conducted code reviews

Software Engineer, StartUp Inc (2018-2020)
- Developed RESTful APIs using Node.js and Express
- Improved application performance by 40%
- Collaborated with UX team for frontend implementations

SKILLS
- JavaScript, Node.js, React, Express
- AWS, Docker, CI/CD
- Agile methodologies
- Team leadership

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2014-2018)`;

          // Sample job description
          const jobDescription = `Senior Full Stack Developer

We are seeking a skilled Senior Full Stack Developer to join our growing team.

Requirements:
- 5+ years experience in web development
- Strong proficiency in JavaScript and Node.js
- Experience with modern frontend frameworks
- Knowledge of CI/CD practices
- Team leadership experience

Responsibilities:
- Develop and maintain web applications
- Lead technical projects
- Mentor junior developers
- Implement best practices
- Collaborate with cross-functional teams

We offer:
- Competitive salary
- Remote work options
- Professional development
- Health benefits
- Stock options`;

          // Create CV upload record
          const cvBuffer = Buffer.from(cvContent);
          const jobBuffer = Buffer.from(jobDescription);

          // Create CV upload record
          const { data: cvUpload, error: cvError } = await supabaseAdmin
              .from('uploads')
              .insert({
                  user_id: user.id,
                  document_type: 'cv',
                  file_type: 'text/plain',
                  original_filename: 'test_cv.txt',
                  file_size: cvBuffer.length
              })
              .select()
              .single();

          if (cvError) {
              throw cvError;
          }

          // Create job description upload record
          const { data: jobUpload, error: jobError } = await supabaseAdmin
              .from('uploads')
              .insert({
                  user_id: user.id,
                  document_type: 'job_description',
                  file_type: 'text/plain',
                  original_filename: 'test_job.txt',
                  file_size: jobBuffer.length
              })
              .select()
              .single();

          if (jobError) {
              throw jobError;
          }

          // Generate letter using Claude directly with text content
          const generatedContent = await generateLetterContent(
              cvContent,
              jobDescription,
              'cover_letter'
          );

          // Create letter record
          const { data: letter, error: letterError } = await supabaseAdmin
              .from('generated_letters')
              .insert({
                  user_id: user.id,
                  letter_type: 'cover_letter',
                  cv_upload_id: cvUpload.id,
                  job_desc_upload_id: jobUpload.id,
                  content: generatedContent,
                  payment_status: 'completed'
              })
              .select()
              .single();

          if (letterError) {
              throw letterError;
          }

          res.json({
              success: true,
              data: {
                  letter,
                  user,
                  cvContent,
                  jobDescription
              }
          });

      } catch (error) {
          console.error('Test letter generation error:', error);
          res.status(500).json({
              error: 'Failed to generate test letter',
              details: error.message
          });
      }
  });

  // Get user dashboard data
  app.get('/dashboard/:userId', async (req, res) => {
      try {
          const userId = req.params.userId;

          const { data: uploads, error: uploadsError } = await supabaseAdmin
              .from('uploads')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

          if (uploadsError) {
              throw uploadsError;
          }

          const { data: letters, error: lettersError } = await supabaseAdmin
              .from('generated_letters')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

          if (lettersError) {
              throw lettersError;
          }

          res.json({
              uploads,
              letters
          });

      } catch (error) {
          console.error('Dashboard data fetch error:', error);
          res.status(500).json({ 
              error: 'Failed to fetch dashboard data',
              details: error.message 
          });
      }
  });

  // Error handling
  app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  app.use((req, res) => {
      res.status(404).json({ error: 'Not Found' });
  });

  // Start the server
  const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (error) => {
      console.error('Server error:', error);
  });

} catch (error) {
  console.error('Error initializing Supabase:', error);
  process.exit(1);
}
