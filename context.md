# VIPCall Project Context

This file serves as the single source of truth for the **VIPCall** project context, architecture, user request logs, and execution guidelines. Any developer or AI agent resuming this task should read this file first.

---

## 1. Project Overview & Scope
- **Domain**: General buying and selling marketplace (moved away from furniture-specific catalog).
- **Target Location**: `x:\Techora\vip`
- **Tech Stack**:
  - **Backend**: Node.js, Express, MongoDB/Mongoose (using `connect-mongo` for persistent production-ready session stores).
  - **Frontend**: Vanilla HTML5, CSS3, and JavaScript (strictly zero external frontend libraries).
- **Default Port**: `8888`
- **Testing Credentials**:
  - **Username**: `admin`
  - **Password**: `admin123`

---

## 2. Completed Implementations & Features

### Listing Management
- **Responsive Grid**: Items are rendered in a CSS grid (`repeat(auto-fill, minmax(280px, 1fr))`) where the item image is the main highlight.
- **INR Currency Format**: Price inputs and listings display price values using the Indian Rupee symbol (**₹**) formatted to the Indian layout standard (`₹1,45,000` or `₹8,500`) using `.toLocaleString('en-IN')`.
- **Edit Listings (PUT Endpoint)**:
  - Form toggles modes dynamically between "Add New" and "Edit Listing".
  - Secure `/api/products/:id` (PUT) saves updates and refreshes lists without full page reload.
  - A cancel edit button resets the portal state.
- **Client-Side Image Cropping**:
  - A vanilla drag-and-zoom cropping container operates on the file dropzone.
  - Constrains the image so it always covers the crop viewport (no white boundaries).
  - On submit, draws the cropped area onto an off-screen HTML5 `<canvas>` at a high resolution and generates a JPEG Data URL.
  - Tracks whether the image has actually been cropped (`hasImageBeenCropped`) to avoid re-cropping already cropped images during metadata updates.
- **Responsive Card Cover fitting**:
  - `.card-image` uses `object-fit: cover` to render listings completely flush inside their cards.
- **Listing Loading Skeleton**:
  - Animates keyframe-based shimmer gradients on placeholder cards while fetching the data from MongoDB.

### Security & System Resilience
- **Persistent Sessions**: Backed by `connect-mongo` storing sessions in MongoDB instead of memory, preventing administrator logouts on server restarts.
- **Environment Safety**: Refactored database seeding to check count first (`countDocuments() === 0`) instead of calling `deleteMany()`, preserving user-generated listings.
- **Bug Fixes**:
  - Resolved mobile layout bug where relative positioning on `.panel-right` created a giant empty cream block above the listings when closed. The drawer is fixed-positioned on mobile viewports.
  - Added global `/api` route middleware setting `Cache-Control: no-store, no-cache, must-revalidate, private` to prevent browser cache from serving obsolete `304 Not Modified` states after listings are updated.

---

## 3. How to Run & Verify

### Install Dependencies
```bash
npm install
```

### Start Server
```bash
npm start
```
*Note: Make sure a local MongoDB server is running on `mongodb://127.0.0.1:27017/vipcall` or configure the connection string via `MONGODB_URI` in `.env`.*

---

## 4. Customization Rules (Ponytail Persona)
This workspace utilizes the `/ponytail` persona guidelines (efficient, minimal, stdlib/native features first, no abstractions, boring over clever).
- Workspace rules are defined in [AGENTS.md](file:///x:/Techora/vip/.agents/AGENTS.md).
- The `ponytail` skill is local to this project and located in [.agents/skills/ponytail/SKILL.md](file:///x:/Techora/vip/.agents/skills/ponytail/SKILL.md).
