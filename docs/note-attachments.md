---
sidebar_position: 5
---

# Notes Attachments

Files are stored on disk or in S3; PostgreSQL stores their details and note
references. Both storage options use the same API.

## Setup

Install `docs/requirements.txt` and run `alembic upgrade head` before serving requests.

By default, `ATTACHMENTS_STORAGE=local` stores files in
`ATTACHMENTS_LOCAL_ROOT=./data/attachments`, relative to the API's working
directory. Compose mounts the `attachments_data` volume at `/app/data/attachments`.
If you change this path, update the volume mount and give the API read/write
access. Keep the directory private. Multiple API instances need shared storage or S3.

For S3-compatible storage:

```dotenv
ATTACHMENTS_STORAGE=s3
ATTACHMENTS_S3_BUCKET=perga
ATTACHMENTS_S3_ENDPOINT_URL=https://s3.example.com
ATTACHMENTS_S3_REGION=us-east-1
ATTACHMENTS_S3_ADDRESSING_STYLE=auto
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

For AWS S3, omit `ATTACHMENTS_S3_ENDPOINT_URL`. Choose `auto`, `path`, or
`virtual` addressing as required by your provider. Supply credentials through
environment variables, IAM roles, or another standard boto3 credential source.

Create a private bucket and allow object read, write, and delete under `notes/`.
Keep public access disabled. Other S3 providers must support PutObject,
GetObject, and DeleteObject; test your provider before use.

Invalid storage settings or local directory errors prevent startup. S3 access
is checked during file operations; provider failures return 503.

To switch storage, stop writes, copy files with the same relative paths,
change the settings, and check that files open. Files are not moved automatically.
Back up and restore PostgreSQL and attachment storage together.

## API

All routes require `Authorization: Bearer ...`.

| Method | Route | Result |
| --- | --- | --- |
| POST | `/api/v1/notes/{note_id}/attachments/` | Upload multipart field `file`; returns 201 with file details |
| GET | `/api/v1/notes/{note_id}/attachments/` | List attachments, including unused uploads within the retention period |
| GET | `/api/v1/notes/{note_id}/attachments/{id}/content/` | Download a file; use `?preview=true` for a smaller image |

`API_V1_STR` sets the `/api/v1` prefix. Metadata includes `id`, `note_id`,
`original_filename`, `content_type`, `size_bytes`, `width`, `height`, `created_dt`
and `url`. IDs are integers; internal storage paths are not exposed.

Create the note first, upload its images, then save its HTML body:

```html
<p>Screenshot:</p>
<img data-attachment-id="ATTACHMENT_ID" src="RETURNED_ATTACHMENT_URL" alt="Screenshot">
```

The API checks ownership and availability, then fills in `src`. The returned
URL also works without an ID. Invalid, expired, or another user's attachments
return 422. Each attachment belongs to one note; upload a new copy for another note.
New external images are rejected. Existing external images in old notes can
be kept unchanged, but cannot be copied or modified. The API does not download them.

Attachment URLs are relative to the API origin. A browser `<img>` cannot send
a Bearer header: fetch the image with authentication and display a temporary
`blob:` URL. Save the returned API URL and attachment ID, not the blob URL.
All uploads and downloads go through the API, including S3 files; public and
presigned URLs are not supported. Downloads use `Cache-Control: private, no-store`
and `X-Content-Type-Options: nosniff`.

Images over 1600 pixels on their longest edge get a WebP preview on upload or
import. The editor requests it with `?preview=true`; if unavailable, the API
returns the original. Check `Content-Type` for the format. Other requests and
exports use the original. Cleanup removes both files.

Use **Insert image** or **Attach file**, paste files, or drag them into a note.
Uploads show their progress and errors; uploaded images are saved automatically.
You can upload as soon as a new note opens.

PNG, JPEG and WebP images display inline. PDF, TXT, Markdown, CSV, Word,
Excel, PowerPoint and ZIP files appear as download links with an icon showing
the file extension. `attachment_type` is `image` or `file`. Files have null
`width` and `height` and are served as
`application/octet-stream` with `Content-Disposition: attachment`.
Use `<a data-attachment-id="ATTACHMENT_ID">Filename</a>` to reference a file
in note HTML. The API fills in the canonical download URL.

Use **Open original** on an attachment to open the full-resolution file in a new
tab. The browser's **Open image in new tab** opens the displayed image, which
may be a preview.

Resize an image with its lower-right handle, or focus the handle with Tab and
use Left/Right. The image keeps its proportions. Its display width is saved in
the note; Undo restores the previous width.

Select an image and press Delete or Backspace to remove it. Undo can restore
it during the retention period. Unused files are removed by scheduled cleanup.

## Validation and limits

Images must be static PNG, JPEG, or WebP. The API checks file contents and
rejects SVG, animation, corrupt images, and oversized files. Originals are
stored without resizing or removing metadata.

| Setting | Default |
| --- | --- |
| `ATTACHMENTS_MAX_FILE_SIZE_MB` | 10 MiB per file (supported setting: 1–100) |
| `ATTACHMENTS_MAX_IMAGE_PIXELS` | 25,000,000 pixels |
| `ATTACHMENTS_MAX_USER_STORAGE_MB` | 1,024 MiB across a user's attachments |
| `ATTACHMENTS_MAX_PER_NOTE` | 100 attachment records |
| `ATTACHMENTS_UNUSED_TTL_DAYS` | 7 days |

Uploads and files awaiting deletion count toward quotas until cleanup finishes.
Size, pixel, or quota violations return 413; invalid or unsupported images return 415.
Notes in Trash can be read but not edited or given new attachments (409).

Nginx allows 11 MiB per upload request for the default 10 MiB file limit.
If you increase `ATTACHMENTS_MAX_FILE_SIZE_MB`, also raise `client_max_body_size`
in `nginx/nginx.conf` to the file limit plus at least 64 KiB for upload overhead.
This is not automatic. Set equivalent limits on any other proxy; configure
request timeouts and concurrency separately from storage quotas.

## Cleanup and failure recovery

Schedule this command periodically (for example, hourly):

```sh
docker compose exec -T app python -m app.commands.cleanup_attachments --limit 100
```

Without Docker, run `python -m app.commands.cleanup_attachments --limit 100`
from the API root with the server's environment and storage access. Each run
checks up to 100 candidates; adjust the limit or schedule for your upload volume.

New uploads must be added to a note before the retention period ends. Removing
the last reference starts the same retention period. During this time, files
can still be listed, read, and restored with Undo. After expiry, they become
unavailable even if cleanup has not yet deleted them.

Trash preserves attachments. Permanently deleting a note or folder makes its
attachments ready for cleanup immediately. Unfinished uploads expire after
24 hours. Cleanup retries failed deletions on later runs. It is safe to run
repeatedly or concurrently.

## Export and import

HTML and Markdown exports with attachments come as ZIP files with an `assets/`
directory and relative links, without internal attachment IDs. Single notes
without attachments export as plain HTML or Markdown. PDFs include images
and show other attachment names as text.

To import local attachments, put the document and its files in a ZIP. The API
creates new attachments and updates their links. External images, duplicate
paths, and paths outside the archive are rejected. Limits are 10 MiB uploaded,
1,000 ZIP entries, and 100 MiB uncompressed data. Image and storage quotas also apply.

If an attachment fails to import, its incomplete note is marked deleted and
its files are scheduled for cleanup. Previously imported notes are kept.
