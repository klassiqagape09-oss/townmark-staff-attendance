# Townmark Estate Limited – Staff Attendance Portal

Staff attendance portal built with Vite, vanilla JavaScript and Supabase.

Features: staff authentication, secure clock-in and clock-out, personal attendance history, administrator dashboard, staff directory and attendance summaries. Official resumption time is 8:30 AM. All display times use Africa/Lagos.

## Configuration
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables. Use a Supabase publishable key (or legacy anon key). Never expose a service-role or secret key in frontend code.

## Deploy on Vercel
Import this repository, select Vite, use `npm run build` as the build command and `dist` as the output directory. Add the two Supabase environment variables before deploying.
