#!/usr/bin/env node
/**
 * generate-mindmap.js
 * 
 * Reads a mind map JSON data file and produces a self-contained HTML file
 * using D3.js with Ranken-branded styling.
 *
 * Usage:
 *   node generate-mindmap.js <data.json> [output.html]
 *
 * The JSON file should follow the schema in mindmap-data-schema.jsonc
 *
 * If base64 images are stored in separate files, reference them in the JSON
 * with "imageFile": "path/to/image.b64" and this script will inline them.
 */

const fs = require('fs');
const path = require('path');

// ── Parse args ──
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-mindmap.js <data.json> [output.html]');
  process.exit(1);
}

const dataPath = path.resolve(args[0]);
const dataDir = path.dirname(dataPath);

if (!fs.existsSync(dataPath)) {
  console.error(`Data file not found: ${dataPath}`);
  process.exit(1);
}

// ── Load and process data ──
let data;
try {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  // Strip JSONC comments only for .jsonc files (not .json, which may contain base64)
  const isJsonc = dataPath.endsWith('.jsonc');
  const cleaned = isJsonc
    ? raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    : raw;
  data = JSON.parse(cleaned);
} catch (err) {
  console.error(`Failed to parse JSON: ${err.message}`);
  process.exit(1);
}

// Inline any imageFile references
function inlineImages(node) {
  if (node.detail && node.detail.images) {
    node.detail.images = node.detail.images.map(img => {
      if (img.imageFile && !img.src) {
        const imgPath = path.resolve(dataDir, img.imageFile);
        if (fs.existsSync(imgPath)) {
          const b64 = fs.readFileSync(imgPath, 'utf-8').trim();
          const ext = path.extname(img.imageFile).replace('.', '').replace('b64', 'jpeg');
          img.src = `data:image/${ext};base64,${b64}`;
          delete img.imageFile;
        } else {
          console.warn(`Warning: Image file not found: ${imgPath}`);
        }
      }
      return img;
    });
  }
  if (node.children) node.children.forEach(c => inlineImages(c));
}
inlineImages(data);

// ── Extract title from root node ──
const title = data.name.replace(/\\n/g, ' ').replace(/\n/g, ' ');

// ── Read template ──
const templatePath = path.resolve(__dirname, '..', 'templates', 'd3-mindmap-template.html');
if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  console.error('Place d3-mindmap-template.html in the same directory as this script.');
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf-8');

// ── Inject data and title ──
template = template.replace('{{TITLE}}', title);
template = template.replace('{{MINDMAP_DATA}}', JSON.stringify(data, null, 2));

// ── Write output ──
const outputPath = args[1]
  ? path.resolve(args[1])
  : path.resolve(dataDir, `${title.replace(/[^a-zA-Z0-9]+/g, '_')}_MindMap.html`);

fs.writeFileSync(outputPath, template, 'utf-8');
console.log(`Mind map generated: ${outputPath}`);
console.log(`  Nodes: ${countNodes(data)}`);
console.log(`  Branches: ${(data.children || []).length}`);

function countNodes(node) {
  let count = 1;
  if (node.children) node.children.forEach(c => { count += countNodes(c); });
  return count;
}
