# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Local Development Setup

To switch from the default Cloud Supabase backend to a **Local Supabase** instance, follow these steps.

### Prerequisite: Install Docker (Linux)
You need Docker URL to run the local Supabase services.

```bash
# 1. Update package index
sudo apt-get update

# 2. Install Docker
sudo apt-get install -y docker.io

# 3. Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# 4. Give yourself permission to run Docker (avoids using 'sudo' every time)
sudo usermod -aG docker $USER
```
> **Important:** After running step 4, you must **log out and log back in** for the permissions to take effect.

### Step 1: Start Supabase Locally
Once Docker is running, go to your project folder and start Supabase:

```bash
npx supabase start
```

This will print your local credentials (API URL, keys) to the terminal.

### Step 2: Configure Environment
Create a `.env.local` file to override the default cloud settings.

1.  Copy the template:
    ```bash
    cp .env.local.example .env.local
    ```
2.  Edit `.env.local` and paste the values from the `npx supabase start` output:
    ```bash
    VITE_SUPABASE_URL="http://127.0.0.1:54321"
    VITE_SUPABASE_PUBLISHABLE_KEY="<paste-your-anon-key-here>"
    ```

### Step 3: Run the App
Now run the development server, which will automatically use your local configuration:

```bash
npm run dev
```
