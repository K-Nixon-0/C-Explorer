# Book Finder (C-Explorer)

A small web app to **search books**, **sort** the results and **filter** by cover. Built with plain HTML, CSS and JavaScript, served by **Nginx** on two web servers, with a third server acting as an **Nginx load balancer**.

| | |
|---|---|
| 🌐 **Live site (load balancer)** | http://18.133.157.198 |
| 🎥 **Demo video (under 2 min)** | https://youtu.be/sT9udMGDmk0 |
| 💻 **Source code** | https://github.com/K-Nixon-0/C-Explorer |
| 🔑 **API key needed?** | No. The API is public and keyless |
| 🔐 **Login needed?** | No. The app is open |

---

## 1. Features

| Feature | How to use it |
|---|---|
| Search | Type any word (title, author, topic) and press **Search** |
| Sort | Choose **Newest first**, **Oldest first** or **A - Z** |
| Filter | Tick **With cover only** to hide books without a cover |
| Error handling | If the API is down or returns an error, a message is shown instead of crashing |
| Safe output | Text from the API is escaped to prevent XSS |

---

## 2. API used

| | |
|---|---|
| **Name** | Open Library Search API |
| **Key required** | No |
| **Credit** | Thanks to Open Library / Internet Archive for the free API |

---

## 3. Project files

| File | What it does |
|---|---|
| `index.html` | Page structure: search form, sort dropdown, cover checkbox, results area |
| `style.css` | Layout and look: centered page, responsive card grid |
| `app.js` | Calls the API, then sorts, filters and displays the results |
| `.gitignore` | Stops secrets (`.env`, keys, zip files) from being uploaded |
| `README.md` | This documentation |

### What `app.js` does

| Part | Purpose |
|---|---|
| `esc()` | Escapes special characters so API text cannot inject HTML |
| `render()` | Applies the cover filter and chosen sort, then draws one card per book |
| `submit` listener | Calls the API with `fetch`, saves results in `books`, then calls `render()` |
| `.catch()` | Shows `Could not load data` if the request fails |
| `change` listeners | Re-run `render()` when sort or filter changes (no new API call) |

---

## 4. Run locally

```bash
git clone https://github.com/K-Nixon-0/C-Explorer.git
cd C-Explorer
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

---

## 5. Architecture

```
            User's browser
                  │
                  ▼
     ┌────────────────────────┐
     │  Lb01 (load balancer)  │  18.133.157.198
     │  Nginx, round-robin    │
     └───────────┬────────────┘
          ┌──────┴───────┐
          ▼              ▼
   ┌────────────┐  ┌────────────┐
   │   Web01    │  │   Web02    │
   │ 18.134.    │  │ 35.178.    │
   │ 245.178    │  │ 19.144     │
   │ Nginx+app  │  │ Nginx+app  │
   └────────────┘  └────────────┘
```

| Server | Name | IP | Role |
|---|---|---|---|
| Web01 | `7311-web-01` | 18.134.245.178 | Nginx serving the app |
| Web02 | `7311-web-02` | 35.178.19.144 | Nginx serving the app |
| Lb01 | `7311-lb-01` | 18.133.157.198 | Nginx load balancer (round-robin) |

---

## 6. Deploy on the web servers (Web01 and Web02)

Connect to each server (`ssh ubuntu@18.134.245.178`, then `ssh ubuntu@35.178.19.144`) and run the same block on both:

```bash
sudo apt update && sudo apt install -y nginx git
sudo rm -rf /var/www/html
sudo git clone https://github.com/K-Nixon-0/C-Explorer.git /var/www/html
sudo tee /etc/nginx/sites-available/default >/dev/null <<'CONF'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;
    add_header X-Served-By $hostname;
    location / { try_files $uri $uri/ =404; }
}
CONF
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager | head -5
curl -sI http://localhost | grep -E "HTTP|X-Served-By"
```

| Step | Why |
|---|---|
| Install `nginx` and `git` | Web server and a way to download the project |
| `git clone` into `/var/www/html` | Puts the project where Nginx serves files from |
| Nginx config | Serves `index.html` on port 80 |
| `add_header X-Served-By $hostname` | Adds the server name to every response, so we can prove which server answered |
| `nginx -t` | Checks the config for errors before applying it |
| `enable` + `restart` | Starts Nginx now and on every reboot |

**Expected result:** `active (running)`, `HTTP/1.1 200 OK` and `X-Served-By: 7311-web-01` (or `-02`).

**Update the site later** (run on both servers after pushing changes to GitHub):

```bash
cd /var/www/html && sudo git pull
```

---

## 7. Configure the load balancer (Lb01)

Connect with `ssh ubuntu@18.133.157.198` and run:

```bash
sudo apt update && sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/default >/dev/null <<'CONF'
upstream app {
    server 18.134.245.178;
    server 35.178.19.144;
}
server {
    listen 80 default_server;
    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
CONF
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager | head -5
```

| Config line | Meaning |
|---|---|
| `upstream app { ... }` | The pool of backend servers (Web01 and Web02). Default method is round-robin |
| `listen 80 default_server` | Accept web traffic on port 80 |
| `proxy_pass http://app` | Forward each request to the next server in the pool |
| `proxy_set_header Host` / `X-Real-IP` | Pass the original host name and visitor IP to the backend |

The load balancer holds no project files. It only forwards traffic.

---

## 8. Test the load balancer

```bash
for i in 1 2 3 4; do curl -sI http://18.133.157.198 | grep X-Served-By; done
```

Output (alternates between both servers, so traffic is shared):

```
X-Served-By: 7311-web-01
X-Served-By: 7311-web-02
X-Served-By: 7311-web-01
X-Served-By: 7311-web-02
```

**In the browser:** open http://18.133.157.198, press **F12**, go to **Network**, reload, click the first request and read **Response Headers → X-Served-By**. It changes between servers on reload.

| Test | Result |
|---|---|
| App on Web01 directly | ✅ 200 OK |
| App on Web02 directly | ✅ 200 OK |
| App through load balancer | ✅ works |
| Traffic split between servers | ✅ alternates 01 / 02 |

---

## 9. Security

| Item | Status |
|---|---|
| API keys | None used (keyless API), so nothing to leak |
| Secrets in repo | `.gitignore` excludes `.env*`, `*.pem`, `id_rsa*`, `*.zip` |
| SSH keys | Private keys are never committed |

---

## 10. Challenges and solutions

| Challenge | Solution |
|---|---|
| First API was deprecated | Switched to the keyless Open Library API |
| GitHub push refused (403, wrong saved account) | Used the correct account and a personal access token |
| Typos broke the app (`localeCompare`, `first_publish_year`, stray `)`) | Fixed using the browser console errors |
| Script loaded before the page existed | Moved the `<script>` to run after the HTML |
| Gave deploy commands into the wrong terminal | Checked the prompt (`ubuntu@7311-...`) before running; restored the default config |
| Nginx config errors | Always ran `sudo nginx -t` before restarting |

---

## 11. Credits

| Resource | Use |
|---|---|
| [Nginx](https://nginx.org) | Web server and load balancer |
| Git / GitHub | Version control and deployment |
