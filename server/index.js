const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fileUpload = require('express-fileupload');
const path = require('path');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET);
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Debug environment variables
console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Present' : 'Missing');

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
  const PORT = 4000;

// Middleware
app.use(fileUpload());
app.use(express.json());
app.use(express.static('public'));

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

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

        // Create letter record
        const { data: letter, error: letterError } = await supabaseAdmin
            .from('generated_letters')
            .insert({
                user_id: userId,
                letter_type: letterType,
                cv_upload_id: cvId,
                job_desc_upload_id: jobDescId,
                content: 'Generated letter content will go here', // Replace with actual AI generation
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

} catch (error) {
  console.error('Error initializing Supabase:', error);
  process.exit(1);
}
