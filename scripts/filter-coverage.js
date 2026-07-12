import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const markdownLines = [];
let separatorCount = 0;

rl.on('line', (line) => {
  const parts = line.split('|');
  if (parts.length === 6) {
    // Keep only the first 5 columns and add the closing pipe for console output
    const consoleLine = parts.slice(0, 5).join('|') + '|';
    console.log(consoleLine);

    // Format for markdown compatibility in README.md
    const isSeparator = parts[0].trim().startsWith('-') || parts[0].trim() === '';
    if (isSeparator) {
      separatorCount++;
      if (separatorCount === 2) {
        // The middle separator is the markdown table header separator
        markdownLines.push('| :--- | :--- | :--- | :--- | :--- |');
      }
      // Skip the 1st (top) and 3rd (bottom) separators in markdown output
    } else {
      const formattedMarkdown = '| ' + parts.slice(0, 5).map(s => s.trim()).join(' | ') + ' |';
      markdownLines.push(formattedMarkdown);
    }
  } else {
    console.log(line);
  }
});

rl.on('close', () => {
  if (markdownLines.length === 0) return;

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const readmePath = path.resolve(__dirname, '../README.md');

    if (!fs.existsSync(readmePath)) return;

    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    const startTag = '<!-- START_COVERAGE -->';
    const endTag = '<!-- END_COVERAGE -->';

    const startIndex = readmeContent.indexOf(startTag);
    const endIndex = readmeContent.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const newTableContent = '\n' + markdownLines.join('\n') + '\n';
      const before = readmeContent.substring(0, startIndex + startTag.length);
      const after = readmeContent.substring(endIndex);
      const updatedReadme = before + newTableContent + after;

      fs.writeFileSync(readmePath, updatedReadme, 'utf8');
      console.log('\n📝 README.md test coverage table updated automatically!');
    }
  } catch (err) {
    console.error('\n⚠️ Failed to automatically update README.md coverage table:', err.message);
  }
});
