# Review and approval, admin-only downloads

## Apply, in this order
1. Supabase SQL editor: run `supabase/migrations/0016_photo_review.sql` (safe to run twice; existing photos stay approved).
2. Unzip over the project root.
3. DELETE these files (staff can no longer download; they are kept only as harmless stubs until you delete them):
   - src/app/api/[id]/route.ts            (an old stray copy of the photo route that also served full-size photos)
   - src/app/api/my-download-manifest/route.ts
   - src/components/uploads/MyDownloadButton.tsx
   - src/lib/download/my-manifest.ts
   - src/lib/schemas/my-download.ts
   - src/lib/i18n/messages/my-download.ts
4. Restart `npm run dev`. No new packages.

## How it works
- Staff upload -> photos are stored and wait as "pending". They are NOT in the gallery, Program tab, calendar or downloads.
- Admin opens Review (sidebar, with a count): photos grouped Village > Activity type. Open a photo full size, approve or reject
  (with an optional reason), one by one, by selection, or all shown. Approved photos join the library.
- Rejected photos are deleted from storage; the person who uploaded sees "Rejected" and the reason in My uploads.
- Admin can download the waiting photos (all or selected) as a ZIP: Village / Activity type / photos.
- Photos uploaded by an admin are approved at once.
- Only admins can open or download full-size photos. Staff see small previews of their own photos only.
