# Raise Your Hand — Netlify pilot

This folder is ready for a manual Netlify deployment.

## Files

- `index.html` — phone-safe exhibit and Netlify submission form
- `approved-stories.json` — only staff-approved community submissions; currently empty
- `approved-stories.example.json` — placeholder-only example showing the required structure
- `netlify.toml` — publish and security-header settings

## What the submission flow does

1. A visitor completes one of the service/family intake paths.
2. The form is sent privately to Netlify Forms.
3. The visitor sees their own pending marker on that device.
4. Other visitors do **not** see it yet.
5. Staff review the entry in Netlify.
6. An approved entry can be copied into `approved-stories.json` and the folder redeployed.

This deliberately prevents unmoderated visitor text from appearing publicly.

## First deployment

1. Create or sign in to a Netlify account.
2. In Netlify, choose **Add new project** and then **Deploy manually**.
3. Drag this entire unzipped folder into the deploy area.
4. Open the generated `netlify.app` URL.
5. In the site dashboard, open **Forms** and enable form detection if Netlify asks.
6. Redeploy the same folder after enabling detection.
7. Submit one clearly labeled test entry from the live URL.
8. Confirm that `story-submission` appears under **Forms**.

## Local preview

Opening `index.html` directly is enough to test navigation and phone layout. A local preview cannot send to Netlify; the page will clearly label the entry as local-only.

## Publishing an approved community entry

1. Review the submission in Netlify.
2. Confirm the year, category, attribution, and wording.
3. Obtain whatever event-specific approval or permission the MVC requires.
4. Copy the approved text into `approved-stories.json` using `approved-stories.example.json` as the shape.
5. Keep the JSON valid: entries are separated by commas and the whole file is wrapped in `[ ]`.
6. Drag the updated folder to the site's deploy area again.

Do not paste unreviewed submissions into the public file.
