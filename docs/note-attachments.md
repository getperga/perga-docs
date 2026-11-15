---
sidebar_position: 5
---

# Notes Attachments

Attachments are stored outside PostgreSQL. The database contains metadata,
ownership and stable attachment references. Clients use the same API for local
and S3 storage.

## Setup

Install `requirements.txt` and run `alembic upgrade head` before serving requests.

The default backend is `ATTACHMENTS_STORAGE=local`, with files in
`ATTACHMENTS_LOCAL_ROOT=./data/attachments` relative to the application working
directory. Docker Compose mounts a persistent `attachments_data` volume at
`/app/data/attachments`. If you change the directory, update the mount too.
The API process must have read/write access. Never expose this directory as
public static files. Multiple API replicas require a shared volume or S3.

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

Omit `ATTACHMENTS_S3_ENDPOINT_URL` for AWS S3. Addressing style accepts `auto`,
`path`, or `virtual`; choose the setting required by your provider. Credentials
use boto3's standard chain, including environment variables and IAM roles.
The application does not make buckets public or create them. Provision a private
bucket and grant only object read/write/delete permissions for the application
prefix `notes/`. Bucket policies must deny public access; no public-read ACL is
sent. Custom providers need compatible PutObject, GetObject and DeleteObject.

Cloudflare R2, DigitalOcean Spaces and self-hosted S3 implementations can expose
this API; compatibility differs between providers. Automated tests verify SDK
requests and failure mapping, not live compatibility with each provider.

A missing S3 bucket setting or invalid endpoint fails configuration validation.
Storage is constructed at startup; local directory errors fail startup. Network
access and object permissions are checked when operations are attempted;
provider failures return 503 without exposing credentials or internal keys.

Changing the backend does not migrate existing objects. Copy files under the
same relative keys while writes are stopped, switch settings, then verify
reads. Back up both PostgreSQL and the files/bucket and restore them together.

## API

All routes require the existing `Authorization: Bearer ...` authentication.

| Method | Route | Result |
| --- | --- | --- |
| POST | `/api/v1/notes/{note_id}/attachments/` | Multipart field `file`; 201 with metadata |
| GET | `/api/v1/notes/{note_id}/attachments/` | Available ready attachments, including uploads within retention |
| GET | `/api/v1/notes/{note_id}/attachments/{id}/content/` | Private image bytes. Use `?preview=true` to request a smaller representation |

The configured `API_V1_STR` replaces `/api/v1`. Metadata includes `id`, `note_id`,
`original_filename`, `content_type`, `size_bytes`, `width`, `height`, `created_dt`
and `url`. Attachment IDs are integers inherited from the shared `BaseModel`;
storage keys keep random UUID filenames. The internal storage key and provider endpoint are not exposed.

Create the note first, upload its images, then save its HTML body:

```html
<p>Screenshot:</p>
<img data-attachment-id="ATTACHMENT_ID" src="RETURNED_ATTACHMENT_URL" alt="Screenshot">
```

The server verifies ownership and ready status and reconstructs `src`. An image
with only the canonical `src` is also recognized. Unknown/foreign/expired IDs
and new external images are rejected with 422. Existing legacy external images
may be preserved unchanged when editing an old note; new copies or changed
attributes are rejected. The API does not download external URLs. A single
attachment belongs to one note; cross-note copies require uploading a new file.

The returned URL is relative to the API origin. A browser `<img>` cannot attach
a Bearer header: fetch bytes with authentication and render a temporary `blob:`
URL, while persisting the canonical URL and attachment ID. Never persist a blob
URL or an expiring presigned URL. Downloads use `Cache-Control: private,
no-store` and `X-Content-Type-Options: nosniff`. Both storage modes stream through
the API; direct S3 upload, public URLs and presigned downloads are not enabled.

The web editor requests previews for display. When an image larger than 1600
pixels on the longest edge is uploaded or imported, the API generates a WebP
preview and stores it alongside the original.
The API stores the preview key and byte size on the attachment. It uses the
key to locate the preview and the size for the response `Content-Length`.
If no key is set or the preview file is unavailable, the API serves the original.
Existing attachments have neither field set. Read the response `Content-Type` to determine
the format. Requests without `preview=true` and exports use the original.
Attachment cleanup removes both files.

In the web editor, use **Insert image** for images and **Attach file** for
other files. You can also paste files from the clipboard or drag them into the
note body. The editor shows upload
status and any errors. Successfully uploaded images are inserted into the
note and saved by autosave. You can upload images as soon as the new note opens.

PNG, JPEG and WebP images display inline. PDF, TXT, Markdown, CSV, Word,
Excel, PowerPoint and ZIP files appear as download links with an icon showing
the file extension. The API reports
`attachment_type` as `image` or `file`. File attachments have null `width`
and `height`, and the content route serves them as
`application/octet-stream` with `Content-Disposition: attachment`.
Use `<a data-attachment-id="ATTACHMENT_ID">Filename</a>` to reference a file
in note HTML. The API fills in the canonical download URL.

Use **Open original** in the upper-right corner of an attachment to open the
full-resolution file in a new tab. The button appears on hover or selection
and stays visible on touch devices. The browser's **Open image in new tab**
command opens the image displayed in the note.

To resize an uploaded image, drag the handle in its lower-right corner. You can
also focus the handle with Tab and use the Left and Right arrow keys. Resizing
keeps the image's proportions and saves its display width in the note. Undo
restores the previous width.

To remove an image, select it in the editor and press Delete or Backspace.
Undo restores the same attachment while the file is still within the retention
period. Autosave sends the updated note body in edit order, and the cleanup
command removes unused files after the retention period.

The web editor loads images from its configured API with authentication. It
releases temporary object URLs when an image is removed, another note opens,
or the editor closes. The saved HTML contains the stable attachment URL and ID.

## Validation and limits

Only static PNG, JPEG and WebP are accepted. Pillow verifies and decodes images;
client MIME types and filename extensions are not trusted. SVG, animation,
corrupt images, and oversized images are rejected. Original validated bytes are
stored without resizing or metadata stripping.

| Setting | Default |
| --- | --- |
| `ATTACHMENTS_MAX_FILE_SIZE_MB` | 10 MiB per file (supported setting: 1–100) |
| `ATTACHMENTS_MAX_IMAGE_PIXELS` | 25,000,000 pixels |
| `ATTACHMENTS_MAX_USER_STORAGE_MB` | 1,024 MiB across a user's attachments |
| `ATTACHMENTS_MAX_PER_NOTE` | 100 attachment records |
| `ATTACHMENTS_UNUSED_TTL_DAYS` | 7 days |

Pending and soft-deleted attachments count toward quotas until physical cleanup succeeds.
Concurrent upload reservations are serialized per user. File and pixel/quota
violations return 413; unsupported or invalid image data returns 415. Trash
notes are readable but cannot accept uploads/body edits (409).

Attachment upload requests are bounded before multipart parsing, including
chunked requests without Content-Length. Multipart overhead is limited to an
additional 64 KiB. The included Nginx cap is 11 MiB, covering the default
10 MiB file limit and multipart overhead. If you increase
`ATTACHMENTS_MAX_FILE_SIZE_MB`, also increase `client_max_body_size` in
`nginx/nginx.conf` to cover that file size plus at least 64 KiB of overhead.
The static Nginx configuration does not read this environment variable.
Use equivalent limits on any other reverse proxy. Concurrent request limits/timeouts remain deployment
settings, independent of per-user storage quotas.

## Cleanup and failure recovery

Schedule this command periodically (for example, hourly):

```sh
docker compose exec -T app python -m app.commands.cleanup_attachments --limit 100
```

Without Docker, run `python -m app.commands.cleanup_attachments --limit 100` from the API
root with the same environment and storage access as the server. The limit is
candidates per run; schedule enough runs to process the expected volume.

Attachments inherit `id`, `created_dt`, `updated_dt`, `is_deleted`, and
`deleted_dt` from `BaseModel`. Upload status is either `uploading` or `ready`;
there is no separate deletion status or unused timestamp.

A completed upload is initially soft-deleted (`is_deleted=true`, `deleted_dt`
set to the current time) until it is inserted into the note. Saving a reference
restores it (`is_deleted=false`, `deleted_dt=null`). Removing the final reference
soft-deletes it again. Repeated saves without a reference do not reset its
deletion time. Ready soft-deleted files can be listed, read and restored during
the configured retention window, allowing initial insertion and undo. After the
window expires, these endpoints hide them and new references are rejected even
if physical cleanup has not run yet.

Moving a note into trash preserves its images. Permanently deleted notes and
folders make their ready attachments eligible for cleanup immediately. Stale
`uploading` records older than 24 hours are reclaimed; a live upload holds the
note lock during storage I/O, and cleanup skips locked notes.

Cleanup rechecks references under the same note-first locks used by saves and
holds those locks through physical deletion and database commit. This prevents
a save from restoring an attachment while its file is being removed. Failed
storage deletions retain the soft-deleted record and its deletion timestamp for
a later retry. A crash after file deletion is recoverable because deleting an
already absent object succeeds. Commands can run repeatedly and concurrently.
Upload failures attempt compensation; failed compensation remains visible to
scheduled cleanup.

## Export and import

HTML/Markdown exports containing managed attachments are ZIP files with an
`assets/` directory and relative references. Other single-note exports keep
their plain HTML/Markdown response. PDF embeds images and shows the names of
other attachments as text. Exported HTML/Markdown removes internal attachment IDs.

ZIP import recreates attachments and rewrites links with new IDs.
Documents with local attachments must be packaged with their assets in a ZIP.
External image URLs are rejected. Archive paths must remain inside the
archive; duplicate/traversal entries are rejected. Imports are limited to 1,000
ZIP entries and 100 MiB expanded data, in addition to the existing 10 MiB total
uploaded import limit. Image and quota limits also apply during import.

Imports retain the existing incremental semantics across documents. If a
per-document attachment upload fails, the incomplete new note is marked deleted and
its uploaded files become cleanup candidates; already imported documents remain.
