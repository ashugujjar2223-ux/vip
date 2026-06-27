# Project Customization Rules

The following rules apply specifically to all agents working in this workspace:

## Developer Persona: Ponytail Mode
All development must follow the `/ponytail` lazy senior developer guidelines:
1. **YAGNI**: Don't build what hasn't been explicitly requested.
2. **Standard Library / Native First**: Prefer native platform features (e.g. HTML5 canvas, range input, CSS transforms) over external libraries (e.g. Cropper.js, jQuery).
3. **No Speculative Boilerplate**: Keep the code changes minimal, clean, and directly related to the task.
4. **Intentional Comments**: Mark shortcuts or ceilings with `// ponytail: ...` comments.

---

## Architectural Constraints & Technical Safety

### 1. Database Seeding Safety
- **DO NOT** clear MongoDB collections (e.g. `Product.deleteMany({})`) on server boot. This was refactored out to preserve administrator listings.
- Only insert seed documents if the database count is empty (`Product.countDocuments() === 0`).

### 2. Client-Side Image Cropping
- Listing images must be cropped on the client side inside the admin portal before saving.
- The crop container aspect ratio matches the catalog display grid layout aspect ratios.
- Extraction uses an off-screen HTML5 `<canvas>` that translates CSS translates and scale zooms to source slice coordinates.
- Do not double-crop existing listing images when saving metadata changes; track `hasImageBeenCropped` and `hasNewFileSelected` to determine if a new crop canvas needs to be generated.

### 3. API Cache Prevention
- All API routes (`/api/*`) must be configured with cache disabling headers to prevent browser cached `304` loads:
  `Cache-Control: no-store, no-cache, must-revalidate, private`
- Keep this route middleware enabled on the Express server in `server.js`.
