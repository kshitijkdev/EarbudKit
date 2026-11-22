import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  codeSnippet: string;
}

const VIOLATIONS: Violation[] = [];

// Directories to check
const TARGET_DIRS = [
  path.join(process.cwd(), 'app'),
  path.join(process.cwd(), 'src', 'components'),
];

function getTsxFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsxFiles(fullPath));
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkFile(filePath: string) {
  const relPath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Rule 1: Fixed `width: <number>` on button-like containers or styles
  // Checks for button/btn styles with `width: <number>` instead of minWidth/maxWidth/flex
  const buttonStyleRegex = /(?:Btn|Button|btn|button|pill|chip|Pill|Chip|action)\w*:\s*\{[^}]*width:\s*\d+/g;
  let match;
  while ((match = buttonStyleRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    // Allow if it's explicitly an icon-only square button with width and height equal (e.g. 48x48)
    const block = match[0];
    const widthMatch = block.match(/width:\s*(\d+)/);
    const heightMatch = block.match(/height:\s*(\d+)/);
    const isSquareIconButton = widthMatch && heightMatch && widthMatch[1] === heightMatch[1] && parseInt(widthMatch[1], 10) >= 44;
    
    if (!isSquareIconButton) {
      VIOLATIONS.push({
        file: relPath,
        line: lineNumber,
        rule: 'no-fixed-button-width',
        message: 'Fixed width on button/action container; use minWidth, maxWidth, or flex instead.',
        codeSnippet: lines[lineNumber - 1].trim(),
      });
    }
  }

  // Rule 2: TouchableOpacity or Pressable with touch target smaller than 48dp (height < 48 without minHeight: 48)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check height in style definitions for buttons
    if (/(?:btn|button|pill|action|segment|thresh|chip)/i.test(line) && /height:\s*(\d+)/.test(line)) {
      const hMatch = line.match(/height:\s*(\d+)/);
      if (hMatch) {
        const heightVal = parseInt(hMatch[1], 10);
        if (heightVal < 48) {
          // Check if surrounding block has minHeight: 48 or if it's hitSlop covered
          const contextStart = Math.max(0, i - 5);
          const contextEnd = Math.min(lines.length, i + 5);
          const context = lines.slice(contextStart, contextEnd).join('\n');
          if (!context.includes('minHeight') && !context.includes('hitSlop')) {
            VIOLATIONS.push({
              file: relPath,
              line: i + 1,
              rule: 'min-touch-target-48dp',
              message: `Button height (${heightVal}dp) is under 48dp minimum touch target.`,
              codeSnippet: line.trim(),
            });
          }
        }
      }
    }
  }

  // Rule 3: Text inside button containers missing numberOfLines={1}
  // Track button depth with proper JSX tag matching
  let buttonDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Opening button tags
    const buttonOpenMatches = line.match(/<(?:TouchableOpacity|Pressable|TouchableHighlight)\b(?![^>]*\/>)/g);
    if (buttonOpenMatches) {
      buttonDepth += buttonOpenMatches.length;
    }

    // Closing button tags
    const buttonCloseMatches = line.match(/<\/(?:TouchableOpacity|Pressable|TouchableHighlight)>/g);
    if (buttonCloseMatches) {
      buttonDepth = Math.max(0, buttonDepth - buttonCloseMatches.length);
    }

    // Self-closing button tags
    // e.g. <TouchableOpacity ... /> does not increase depth

    if (buttonDepth > 0 && /<Text\b/.test(line)) {
      // Check if this Text has numberOfLines={1}
      // Check current line and subsequent lines until >
      let tagContent = '';
      for (let j = i; j < Math.min(lines.length, i + 5); j++) {
        tagContent += lines[j] + ' ';
        if (lines[j].includes('>')) break;
      }
      if (!tagContent.includes('numberOfLines')) {
        // Exclude icon glyphs
        if (!line.includes('Ionicons') && !line.includes('glyph') && !line.includes('icon')) {
          VIOLATIONS.push({
            file: relPath,
            line: i + 1,
            rule: 'button-text-single-line',
            message: 'Text inside button missing numberOfLines={1} to prevent text clipping/wrapping.',
            codeSnippet: line.trim(),
          });
        }
      }
    }
  }

  // Rule 4: Inline margins (marginLeft / marginRight) on sibling buttons instead of container gap
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:marginRight|marginLeft):\s*\d+/.test(line)) {
      // Check if this is on a button or button container
      if (/(?:btn|button|pill|chip|Action|Row)/i.test(line)) {
        VIOLATIONS.push({
          file: relPath,
          line: i + 1,
          rule: 'no-inline-button-margin',
          message: 'Inline marginLeft/marginRight on button element; use container gap or ButtonRow instead.',
          codeSnippet: line.trim(),
        });
      }
    }
  }

  // Rule 5: Horizontal rows with multiple buttons that do NOT specify flexWrap or ButtonRow
  // Check StyleSheet definitions with flexDirection: 'row' containing 'actions' or 'buttons' without flexWrap
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:actions|buttons|actionRow|buttonRow|actionsRow|btnsRow)/i.test(line) && /:\s*\{/.test(line)) {
      // Check subsequent lines up to }
      let block = '';
      for (let j = i; j < Math.min(lines.length, i + 15); j++) {
        block += lines[j] + '\n';
        if (lines[j].includes('}')) break;
      }
      if (block.includes("flexDirection: 'row'") && !block.includes('flexWrap') && !block.includes('ButtonRow')) {
        VIOLATIONS.push({
          file: relPath,
          line: i + 1,
          rule: 'row-must-wrap',
          message: 'Button action row with flexDirection: "row" missing flexWrap: "wrap".',
          codeSnippet: lines[i].trim(),
        });
      }
    }
  }
}

function run() {
  console.log('--- EarbudKit Layout QA Static Check ---');
  const allFiles: string[] = [];
  for (const dir of TARGET_DIRS) {
    allFiles.push(...getTsxFiles(dir));
  }

  for (const file of allFiles) {
    checkFile(file);
  }

  if (VIOLATIONS.length > 0) {
    console.error(`\nFound ${VIOLATIONS.length} layout QA violation(s):\n`);
    for (const v of VIOLATIONS) {
      console.error(`[${v.rule}] ${v.file}:${v.line}`);
      console.error(`  ${v.message}`);
      console.error(`  Snippet: ${v.codeSnippet}\n`);
    }
    process.exit(1);
  } else {
    console.log(`\nAll ${allFiles.length} files passed layout QA with zero violations!`);
    process.exit(0);
  }
}

run();
