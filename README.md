# TaskCrewAI

TaskCrewAI is a gamified productivity dashboard and AI companion app. Boost your daily productivity with the help of unique AI characters, each with their own personalities, motivational styles, and interactive chat features. Track your tasks, earn XP, build streaks, and form bonds with your favorite companions!

## Features

- **Productivity Dashboard**: Manage your daily tasks, track completion, and earn XP.
- **AI Companions**: Choose from 10 unique AI characters, each with distinct personalities and motivational styles.
- **Chat Interface**: Chat with your companions for motivation, advice, and encouragement. (Powered by OpenAI API)
- **Bond System**: Build relationships with your companions as you complete tasks and interact.
- **Streaks & Rewards**: Maintain daily streaks to earn XP multipliers and unlock new features.
- **Premium Features**:
  - Unlock all 10 characters (Free plan: 5 characters)
  - Have up to 5 active companions (Free: 3)
  - Group chat with up to 3 companions
  - Unlimited daily messages (Free: 20 per companion)
  - Create a custom AI companion

## Tech Stack
- [Next.js](https://nextjs.org/) 15
- [React](https://react.dev/) 19
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Supabase](https://supabase.com/) (used for user data sync)

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd taskcrewai
   ```
2. **Install dependencies:**
   > If you encounter peer dependency errors, use the legacy flag:
   ```sh
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add:
   ```env
   # Required for AI chat
   OPENAI_API_KEY=your_openai_api_key

   # Required for data sync
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```sh
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage
- Sign up or sign in on `/login`.
- Add, complete, and manage your daily tasks.
- Select and chat with AI companions for motivation and advice.
- Track your XP, streaks, and bond levels.
- Upgrade to Premium (simulated) to unlock all features.

## Project Structure
- `app/` - Next.js app directory (pages, layout, API routes)
- `components/` - UI and feature components
- `lib/` - Utility libraries, API clients, and character logic
- `hooks/` - Custom React hooks

## Environment Variables
- `OPENAI_API_KEY` (required): Your OpenAI API key for AI chat functionality.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required): For Supabase user data sync.

## Notes
- Apply the SQL in `supabase/schema.sql` to your Supabase project before running the app.
- The dashboard route (`/`) requires an authenticated Supabase session.
- All AI chat features require a valid OpenAI API key.
- Some features (Premium, account management) are simulated in the current version.

## Credits
- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), and [OpenAI](https://platform.openai.com/).
- Character art and avatars are placeholders. Replace with your own assets as needed.
