supabase start

npm install @supabase/supabase-js
mkdir src/db
supabase gen types typescript --local > src/db/database.types.ts

chat i odowlac sie do
@api-supabase-astro-init.mdc

copy .env.example .env

change DATABASE_URL in .env to your API URL
change SUPABASE_KEY in .env to your anon key

