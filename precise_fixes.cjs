const fs = require('fs');

// Fix ImageGalleryModal
const imgPath = 'src/components/modals/ImageGalleryModal.tsx';
let imgContent = fs.readFileSync(imgPath, 'utf8');
imgContent = imgContent.replace(/catch \(e\)/g, 'catch (_e)');
fs.writeFileSync(imgPath, imgContent);

// Fix TVPage
const tvPath = 'src/pages/tv/TVPage.tsx';
let tvContent = fs.readFileSync(tvPath, 'utf8');

// Remove all // @ts-ignore since "will do nothing if the following line is error-free"
tvContent = tvContent.replace(/[ \t]*\/\/\s*@ts-ignore[\r\n]+/g, '');

// The duplicate hooks block is between "// Dev-only fallback: allow testing logos/QR" 
// and "return () => { clearTimeout(t1); clearTimeout(t2); };\n    }, [config?.sponsors, posts.length, activeIndex]);"
// Let's remove the second occurrence of this block.
// To do this simply, we will find the block by a known regex and remove the *last* match.
const blockStart = '// Dev-only fallback: allow testing logos/QR';
const blockEnd = '}, [config?.sponsors, posts.length, activeIndex]);';

const firstIndex = tvContent.indexOf(blockStart);
const lastIndex = tvContent.lastIndexOf(blockStart);

if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
    // There are duplicates. Remove from lastIndex to the end of that block.
    const endSnippetIndex = tvContent.indexOf(blockEnd, lastIndex);
    if (endSnippetIndex !== -1) {
        const removeStart = lastIndex;
        const removeEnd = endSnippetIndex + blockEnd.length;
        // Also remove any trailing newlines
        tvContent = tvContent.substring(0, removeStart) + tvContent.substring(removeEnd).replace(/^\s+/, '');
    }
}

fs.writeFileSync(tvPath, tvContent);
console.log('Fixed ImageGalleryModal and TVPage.');
