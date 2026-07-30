# 🎮 OpenGame

<p align="center">
  <strong>A modern, open-source browser game platform.</strong><br>
  Host your own collection of HTML5 games with a clean, customizable interface.
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/deverryy/opengame?style=for-the-badge" alt="Stars">
  <img src="https://img.shields.io/github/issues/deverryy/opengame?style=for-the-badge" alt="Issues">
</p>

---

## ✨ Features

-  Modern and clean UI
-  Easy game management
-  Add games in minutes
-  Fast and lightweight
-  Can be hosted as a static website
-  Optional Node.js backend for advanced features
-  Built-in admin panel
-  Custom 404 page
-  Responsive design
-  Easy to customize
-  Completely open source

---

## 📁 Project Structure

```text
opengame/
├── backend/            # Backend files (including server setup)
├── games/              # Your browser games
├── .gitignore
├── 404.html            # Custom 404 page
├── LICENSE
├── README.md
├── admin.html          # Admin panel
├── index.html          # Homepage
├── manage-games.js     # Game management
└── script.js           # Frontend JavaScript

```

---

## 🚀 Installation

OpenGame supports two deployment methods.

### Option 1 — Static Website

If you don't need backend features, you can host OpenGame on any static hosting provider, including:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any standard web server

Simply upload the project files and you're ready to go.

---

### Option 2 — Node.js Server (Recommended)

Use the included backend if you want features that require a server, such as the admin panel or dynamic game management.

#### Requirements

- Node.js 18 or newer
- npm

#### Clone the repository

```bash
git clone https://github.com/deverryy/opengame.git
cd opengame
```

#### Install dependencies

```bash
cd backend
npm install
```

#### Start the server

```bash
cd backend
node server.js
```

The website will be available at:

```
http://localhost:3000
```

---

## 🎮 Adding Games

1. Find the perfect html game you can find!

2. Put it in the games folder! Now whatever the html file is called is what it'll show up on the website! ex: Portal2.html = Portal2 the only difference is that the site removes the .html from the game card

3. Generate the list.json and piracy protection by opening the terminal in the root then run node manage-games.js to run the auto ad remover and the file protection. The file will auto generate a folder called 'games_backup' which will have all the games pre file protection!

4. enjoy :D

Your game is now available to play.

---

## 🎨 Customization

OpenGame is designed to be easy to modify.

You can customize:

- 🎨 Colors
- 🖼️ Backgrounds
- 🏷️ Branding
- 🔤 Fonts
- 🧩 Game cards
- 📂 Layout
- ✨ Animations
- 🧭 Navigation

---

## 🤝 Contributing

Contributions are always welcome!

If you'd like to improve OpenGame:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Commit your changes.
5. Open a Pull Request.

Bug reports and feature requests are appreciated.

---


## ⚖️ Trademark and Naming Policy
While the source code of this project is open-source under the MIT License, the name "OpenGame" and its official branding are protected. 

If you copy, fork, or host this website, you must:
1. Change the name of the website to a completely different title.
2. Remove all official logos and distinct branding assets associated with OpenGame.
3. Not claim any official affiliation with, or endorsement from, the original OpenGame project.
4. Retain visible attribution to the original author (e.g., "Powered by OpenGame") in the website footer of any direct or minor modifications.


---

## ⭐ Support

If you enjoy OpenGame, consider giving the repository a **⭐ Star**.

It helps others discover the project and supports future development.

---

<p align="center">
Made with ❤️ by <strong>Dever</strong>
</p>
