# Job Letter AI

An AI-powered platform for generating professional job-related letters with ease.

## Features

- Generate tailored cover letters from job descriptions
- Create compelling motivation letters
- Upload CV and job descriptions
- Modern, responsive dashboard
- Support for PDF and image uploads
- Real-time file preview
- Mobile-friendly interface

## Tech Stack

- Frontend: HTML, JavaScript, Tailwind CSS
- Backend: Node.js, Express
- Database: Supabase
- Payment: Paystack
- File Upload: express-fileupload
- AI Integration: OpenAI

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account
- Paystack account
- OpenAI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PAYSTACK_SECRET=your_paystack_secret_key
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd job-letter-ai
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. For production
```bash
npm start
```

## Deployment

This application can be deployed to various platforms. Here are the steps for some popular options:

### Render

1. Create a new account on [Render](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the following:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add your environment variables
6. Deploy!

### Railway

1. Create a new account on [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Configure environment variables
5. Deploy!

### Heroku

1. Install Heroku CLI
2. Login to Heroku
```bash
heroku login
```
3. Create a new Heroku app
```bash
heroku create your-app-name
```
4. Set environment variables
```bash
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_KEY=your_supabase_key
heroku config:set PAYSTACK_SECRET=your_paystack_secret_key
heroku config:set OPENAI_API_KEY=your_openai_api_key
```
5. Deploy
```bash
git push heroku main
```

## License

ISC
