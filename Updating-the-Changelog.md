# Updating the Changelog

The changelog is powered by the Docusaurus blog.  
Entries live in the `blog/` folder. All changes go through a pull request so they can be reviewed before they go live.

## Editing an existing entry

1. Go to the repository on GitHub and open the `blog/` folder.
2. Open the folder for the entry you want to edit, then open the `index.mdx` file inside it.
3. Click the pencil icon (**Edit this file**).
4. Make your changes.
5. Use the **Preview** tab to check how it looks.
6. Scroll to the bottom, add a short note about what you changed, and choose **Create a new branch for this commit and start a pull request**.
7. Open the pull request.

## Creating a new entry

Every changelog entry is created as a folder containing an `index.mdx` file.

1. In the `blog/` folder, click **Add file** → **Create new file**.
2. In the filename box, type the full path (this creates the folder and the file at the same time):
   ```
   2026-11-18/index.mdx
   ```
   Use today’s date in `YYYY-MM-DD` format.  
   GitHub will create the folder `2026-11-18` and the file `index.mdx` inside it.
3. Add the frontmatter at the top and your content below (see the next section).
4. Preview your work, then propose the changes on a new branch and open a pull request.

**If you need two entries on the same day** (rare), add a short description after the date:
```
2026-11-18-search/index.mdx
2026-11-18-login-fix/index.mdx
```

If you need images, upload them into the same folder (see the Images section below).

## Frontmatter

Every changelog entry starts with a block of information called **frontmatter**. It sits between two lines of `---` at the very top of the file.

```yaml
---
title: Short clear title
authors: [ebs]
tags: [feature, improvement]
---
```

### What each field means

| Field | What to put | Example |
|-------|-------------|---------|
| `title` | The title people will see | `title: Improved search performance` |
| `authors` | Always use this exact value | `authors: [ebs]` |
| `tags` | Categories from the approved list | `tags: [feature, bugfix]` |
| `date` | Only if you need to override the date in the filename | `date: 2026-11-18` |
| `description` | A short summary (optional) | `description: Faster search results` |

## Author

Always use:

```yaml
authors: [ebs]
```

Do not change this or add other authors.

## Tags

Use **only** these approved tags:

- `feature`
- `improvement`
- `bugfix`
- `breaking-change`

```yaml
tags: [feature, improvement]
```

Do not create new tags. If none of these fit, mention it in your pull request.

## Truncate (the “Read more” marker)

This marker controls what appears on the main changelog list.  
Everything **above** the marker shows in the list. Everything **below** it only appears when someone opens the full entry.

Place this line where you want the summary to end:

```mdx
{/* truncate */}
```

**Example:**

```mdx
---
title: Improved search performance
authors: [ebs]
tags: [feature]
---

Search is now significantly faster on large datasets.

{/* truncate */}

## Details

We rewrote the query engine and added caching.  
Here are the full notes and screenshots...
```

**Tips:**
- Put a short, useful summary above the marker.
- Always include the marker if the entry is longer than a few sentences.
- Leave a blank line before and after `{/* truncate */}`.

## Images

Images are optional. When you need them:

1. Go into the entry folder you just created.
2. Click **Add file** → **Upload files** and upload your images.
3. In `index.mdx`, reference them with a relative path:

```mdx
![Description of the image](./image-name.png)
```

**Example folder structure:**
```
blog/
└── 2026-11-18/
    ├── index.mdx
    ├── search-before.png
    └── search-after.png
```

In `index.mdx` you would write:
```mdx
![Search results before](./search-before.png)
![Search results after](./search-after.png)
```

**Tip:** You can upload the images in the same pull request as the new entry.

## Tips

- Keep titles short and clear.
- Always use `authors: [ebs]`.
- Only use the approved tags listed above.
- Do not rename the folder or the `index.mdx` file after an entry has been published — it can break the URL.
- To keep an entry hidden until you are ready, add `draft: true` in the frontmatter. Remove that line when you want it to go live.
- Preview your changes in GitHub before opening the pull request.
- After the pull request is merged, the entry will appear on the changelog after the next deployment.

## Related pages

- [Markdown Basics](Markdown-Basics)
- [Advanced Formatting](Advanced-Formatting)
- [Pull Request Tips for Editors](Pull-Request-Tips-for-Editors)
- [After You Open a Pull Request](After-You-Open-a-Pull-Request)
