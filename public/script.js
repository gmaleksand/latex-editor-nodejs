const editor = document.getElementById('editor');
const addBlockButton = document.getElementById('add-block');
const exportButton = document.getElementById('export');

// --- State Management ---
let preamble = '\\documentclass[12pt]{article}\n\\usepackage[T1]{fontenc}\n\\usepackage[absolute,overlay]{textpos}\n\\begin{document}\n\\pagenumbering{gobble}\n';
let postamble = '\n\\end{document}';
let l = ''; // The current LaTeX string being edited
let isBackslash = false;
let blockCounter = 0;
let activeBlock = null; // The currently focused text block

// --- LaTeX Code Replacements for Shortcuts ---
let replacements = {
  '\\backslash frac\\vert ': '\\frac{\\vert }{}',
  '\\backslash lim\\vert ': '\\lim_{\\vert }',
  '\\backslash int\\vert ': '\\int_{\\vert }^{}',
  '\\backslash sum\\vert ': '\\sum_{\\vert }^{}',
  '\\backslash prod\\vert ': '\\prod_{\\vert }^{}',
};
const simple_replacements = ['leq', 'geq', 'eqiv', 'neq', 'sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'arcsin', 'arccos', 'arctan', 'arccsc', 'arcsec', 'arccot', 'log', 'ln', 'exp', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'pm', 'div', 'times', 'forall' ,'exists', 'ni', 'partial', 'cdot', 'dagger'];
const onearg_replacements = ['sqrt', 'vec', 'bar', 'overline', 'hat'];

for(let i of simple_replacements) {
  replacements['\\backslash '+i] = '\\' + i + ' ';
}
for(let i of onearg_replacements) {
  replacements['\\backslash '+i+'\\vert '] = '\\' + i + '{\\vert }';
}
const pattern = new RegExp(Object.keys(replacements).join('|').replaceAll('\\', '\\\\'), 'g');


// --- Core Functions ---

/**
 * Sends the LaTeX code of a specific text block to the server for compilation.
 * @param {HTMLElement} textBlock The text block to compile.
 */

let cm = (x) => parseFloat(x) / 75.59; // px to cm

function updateCompilation(textBlock) {
  if (!textBlock) return;

  const latexContent = textBlock.dataset.latex || '';

  // Create a standalone LaTeX document for the single block
  const fullLatexCode = `${preamble}\\begin{textblock*}{${cm(textBlock.style.width)} cm}(${cm(textBlock.style.left)} cm,${cm(textBlock.style.top)} cm)
${latexContent}
\\end{textblock*}${postamble}`;

  const formData = new FormData();
  formData.append('latex', fullLatexCode);

  fetch('/compile', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Compilation failed');
    }
    return response.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const img = textBlock.querySelector('img') || document.createElement('img');
    img.src = url;
    // Clear out the text content, show only the compiled image
    textBlock.innerHTML = '';
    textBlock.appendChild(img);

    $(textBlock).resizable({
    handles: "n, e, s, w, ne, se, sw, nw",
    stop: () => updateCompilation(textBlock)
    }).draggable({
      containment: "parent",
    });
  })
  .catch(error => {
    console.error('Error during compilation:', error);
    // Keep the text visible if compilation fails
    textBlock.innerHTML = textBlock.dataset.latex;

    $(textBlock).resizable({
    handles: "n, e, s, w, ne, se, sw, nw",
    stop: () => updateCompilation(textBlock)
    }).draggable({
      containment: "parent",
    });
  });
}


/**
 * Creates a new draggable and resizable text block.
 */
function createTextBlock() {
  const textBlock = document.createElement('div');
  textBlock.id = `block-${blockCounter++}`;
  textBlock.className = 'text-block';
  textBlock.tabIndex = 0;
  textBlock.style.top = '50px';
  textBlock.style.left = '50px';
  textBlock.style.width = '200px';
  textBlock.style.height = '50px';
  textBlock.dataset.latex = ''; // Initial content

  editor.appendChild(textBlock);

  $(textBlock).resizable({
    handles: "n, e, s, w, ne, se, sw, nw",
    stop: () => updateCompilation(textBlock)
  }).draggable({
    containment: "parent",
  });

  textBlock.addEventListener('focus', () => {
    // Set as active block and load its LaTeX content for editing
    activeBlock = textBlock;
    activeBlock.classList.add('active');
    // Put the raw LaTeX code back for editing
    //activeBlock.innerHTML = activeBlock.dataset.latex;
    activeBlock.dataset.latex += '|';
    l = activeBlock.dataset.latex;
    updateCompilation(activeBlock);
  });

  textBlock.addEventListener('blur', () => {
    // De-focus previous block and render its final state
    //activeBlock.innerHTML = ''; // Clear old content
    l = l.replace('|', '').replace('\\vert ', ''); // Remove the cursor
    activeBlock.dataset.latex = l;
    updateCompilation(activeBlock);
    activeBlock.classList.remove('active');
    activeBlock = null;
  });

  // Initial compilation
  updateCompilation(textBlock);
  return textBlock;
}


function createImageBlock(im) {
  const imageBlock = document.createElement('div');
  imageBlock.id = `image-block-${blockCounter++}`;
  imageBlock.className = 'image-block';
  imageBlock.tabIndex = 0;
  imageBlock.style.top = '50px';
  imageBlock.style.left = '50px';
  imageBlock.style.width = '200px';
  /*imageBlock.style.height = '50px';*/
  editor.appendChild(imageBlock);

  const img = document.createElement('img');
  img.src = im.path;
  imageBlock.appendChild(img);


  $(imageBlock).resizable({
    handles: "n, e, s, w, ne, se, sw, nw",
    aspectRatio: true,
    containment: "parent",
  }).draggable({
    containment: "parent",
  });
}


// --- Event Listeners ---

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    editor.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

addBlockButton.addEventListener('click', createTextBlock);

exportButton.addEventListener('click', () => {
  let finalLatex = preamble = preamble.split('\n').slice(0,3).concat(['\\usepackage{graphicx}']).concat(preamble.split('\n').slice(3)).join('\n');;
  const textBlocks = document.querySelectorAll('.text-block');

  textBlocks.forEach(block => {
    const content = block.dataset.latex.replace(/\|/g, ''); // Clean up cursor
    finalLatex += `\\begin{textblock*}{${cm(block.style.width)} cm}(${cm(block.style.left)} cm, ${cm(block.style.top)} cm)
${content}
\\end{textblock*}
`;
  });

  const imageBlocks = document.querySelectorAll('.image-block');
  imageBlocks.forEach(block => {
    finalLatex += `\\begin{textblock*}{${cm(block.style.width)} cm}(${cm(block.style.left)} cm, ${cm(block.style.top)} cm)
\\includegraphics[width=\\linewidth]{${block.firstChild.src.split('/').pop()}}
\\end{textblock*}
`;
  });

  finalLatex += postamble;

  const blob = new Blob([finalLatex], { type: 'application/x-latex' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.tex';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

let tempImage;

editor.addEventListener('drop', event => {
  const files = event.dataTransfer.files;

  // Upload files
  const formData = new FormData();
  [...files].forEach(file => {
    formData.append('images', file);
  });

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      data.forEach(file => {
        createImageBlock(file);
      });
      tempImage = data;
    })
    .catch(error => {
      console.error('Error uploading:', error);
    });
}, false);


/**
 * Main keyboard handler for LaTeX input.
 */
document.addEventListener('keydown', event => {
  if (!activeBlock) return; // Only handle keys if a block is active

  event.preventDefault();
  event.stopPropagation();

  let c = l.indexOf('|');
  let cursor = '|';
  let mathmode = 0;
  if (c === -1) {
    c = l.indexOf('\\vert ');
    if (c === -1) return; // No cursor found
    mathmode = 1;
    cursor = '\\vert ';
  }
  let m = cursor.length;

  if (event.key.length === 1 && (event.key.match(/[ !\(\)+-.\d\<-?A-Z\[\]a-z]/) )) {
    l = l.slice(0, c) + event.key + l.slice(c);
  } else if (event.key.length === 1 && (event.key.match(/[А-я]/) )) {
    if(!mathmode) {
      let bg = '\\usepackage[english,bulgarian]{babel}'
      if(preamble.indexOf(bg) === -1) {
        preamble = preamble.split('\n').slice(0,1).concat([bg]).concat(preamble.split('\n').slice(1)).join('\n');
      }
      l = l.slice(0, c) + event.key + l.slice(c);
    }
  } else if (event.key === 'ArrowLeft') {
    if (mathmode){
      let big_symbol = l.slice(0, c - 1);
      if (big_symbol.lastIndexOf('\\') != -1) {
        big_symbol = big_symbol.slice(big_symbol.lastIndexOf('\\'));
      }
      if (big_symbol.indexOf(' ') == -1 && big_symbol.indexOf('{') == -1 && big_symbol[0] === '\\') {
        l = l.slice(0, c - big_symbol.length-1) + cursor + big_symbol + l[c-1] + l.slice(c + m);
      } else if (l.slice(c -2, c) === '}{'){
        l = l.slice(0, c - 2) + cursor + '}{' + l.slice(c + m);
      } else if (l.slice(c -3, c) === '}^{'){
        l = l.slice(0, c - 3) + cursor + '}^{' + l.slice(c + m);
      } else if (l.slice(c -2, c) === '^{'){
        l = l.slice(0, c - 2) + cursor + '^{' + l.slice(c + m);
      } else if (l.slice(c -3, c) === '}_{'){
        l = l.slice(0, c - 3) + cursor + '}_{' + l.slice(c + m);
      } else if (l.slice(c -2, c) === '_{'){
        l = l.slice(0, c - 2) + cursor + '_{' + l.slice(c + m);
      } else if (l[c - 1] === '$') {
        l = l.slice(0, c - 1) + '|' + l[c - 1] + l.slice(c + m);
      } else if (c!=0) {
        l = l.slice(0, c - 1) + cursor + l[c - 1] + l.slice(c + m);
      }
    } else {
      if(l[c - 1] === '$') {
        l = l.slice(0, c - 1) + '\\vert ' + l[c - 1] + l.slice(c + m);
      } else if(c!=0) {
        l = l.slice(0, c - 1) + cursor + l[c - 1] + l.slice(c + m);
      }
    }
  } else if (event.key === 'ArrowRight') {
    if (mathmode){
      if (l[c + m] === '\\' && l[c + m + 1] != '\\'){
        let big_symbol = l.slice(c + m);
        if (big_symbol.indexOf(' ') != -1) {
          big_symbol = big_symbol.slice(0, big_symbol.indexOf(' ') + 1);
        }
        if (big_symbol.indexOf('{') != -1) {
          big_symbol = big_symbol.slice(0, big_symbol.indexOf('{') + 1);
        }
        l = l.slice(0, c) + big_symbol + cursor + l.slice(c + m+big_symbol.length);
      } else if (l.slice(c + m, c + m + 2) === '}{'){
          l = l.slice(0, c) + '}{' + cursor + l.slice(c + m + 2);
      } else if (l.slice(c + m, c + m + 3) === '}^{') {
        l = l.slice(0, c) + '}^{' + cursor + l.slice(c + m + 3);
      } else if (l.slice(c + m, c + m + 2) === '^{') {
          l = l.slice(0, c) + '^{' + cursor + l.slice(c + m + 2);
      } else if (l.slice(c + m, c + m + 2) === '_{') {
          l = l.slice(0, c) + '_{' + cursor + l.slice(c + m + 2);
      } else if (l[c + m] === '$'){
        l = l.slice(0, c) + l[c + m] + '|' + l.slice(c + m+1);
      } else if(c+m<l.length) {
        l = l.slice(0, c) + l[c + m] + cursor + l.slice(c + m+1);
      }
    } else {
      if(l[c + m] === '$') {
        l = l.slice(0, c) + l[c + m] + '\\vert ' + l.slice(c + m+1);
      } else if(c+m<l.length) {
        l = l.slice(0, c) + l[c + m] + cursor + l.slice(c + m+1);
      }
    }
  } else if (event.key === 'Backspace') {
    if (mathmode) {
      if (l[c - 1] === '}') {
        let big_symbol = l.slice(0,c);
        let leftbrackets = 0;
        let rightbrackets = 0;
        for (let i = big_symbol.length - 1; i >= 0; i--) {
          if (big_symbol[i] === '}') {
            rightbrackets++;
          } else if (big_symbol[i] === '{') {
            leftbrackets++;
          }
          if (leftbrackets === rightbrackets && !(['^','_','}'].includes(big_symbol[i-1])) && rightbrackets != 0) {
            let bigger_symbol_search = big_symbol.slice(0, i);
            if(bigger_symbol_search.lastIndexOf('\\') != -1 && bigger_symbol_search.lastIndexOf(' ') < bigger_symbol_search.lastIndexOf('\\') && bigger_symbol_search.lastIndexOf('{') < bigger_symbol_search.lastIndexOf('\\')) {
              big_symbol = big_symbol.slice(bigger_symbol_search.lastIndexOf('\\'));
            } else {
              big_symbol = big_symbol.slice(i);
            }
            break;
          }
        }
        l = l.slice(0, c - big_symbol.length) + l.slice(c);
      } else if (l[c - 1] === ' ') {
        let big_symbol = l.slice(0,c-1);
        if (big_symbol.lastIndexOf('\\') > big_symbol.lastIndexOf('{') && big_symbol.lastIndexOf('\\') > big_symbol.lastIndexOf(' ')) {
          big_symbol = big_symbol.slice(big_symbol.lastIndexOf('\\'));
          l = l.slice(0, c - big_symbol.length - 1) + l.slice(c);
        } else {
          l = l.slice(0, c - 1) + l.slice(c);
        }
      } else if (!(['{','$'].includes(l[c - 1] ))) {
        l = l.slice(0, c - 1) + l.slice(c);
      }
    } else {
      l = l.slice(0, c - 1) + l.slice(c);
    }
  } else if (event.key === 'Delete') {
    if (mathmode) {
      if (['\\','{','^','_'].includes(l[c + m])){
        let big_symbol = l.slice(c + m);
        if (l[c + m] === '\\' && big_symbol.indexOf(' ') != -1 && (big_symbol.indexOf('{') == -1 || big_symbol.indexOf('{') > big_symbol.indexOf(' '))) {
          big_symbol = big_symbol.slice(0, big_symbol.indexOf(' ') + 1);
        }
        if (big_symbol.indexOf('{') != -1) {
          let leftbrackets = 0;
          let rightbrackets = 0;
          for (let i = 0; i < big_symbol.length; i++) {
            if (big_symbol[i] === '{') leftbrackets++;
            else if (big_symbol[i] === '}') rightbrackets++;
            if (leftbrackets > 0 && leftbrackets === rightbrackets && !(['^','_','{'].includes(big_symbol[i+1]))) {
              big_symbol = big_symbol.slice(0, i+1);
              break;
            }
          }
        }
        l = l.slice(0, c + m) + l.slice(c + m + big_symbol.length);
      } else if (!(['}','$'].includes(l[c + m]))) {
        l = l.slice(0, c + m) + l.slice(c + m + 1);
      }
    }
    else {
      l = l.slice(0, c + m) + l.slice(c + m + 1);
    }
  } else if (event.key === '\\' && mathmode) {
    l = l.slice(0, c) + '\\backslash ' + l.slice(c);
    isBackslash = true;
  } else if (event.key === 'Enter') {
    if(!mathmode){
      l = l.slice(0, c) + '\n\n' + l.slice(c);
    } else {
      l = l.slice(0, c) + '\\\\' + l.slice(c);
    }
  } else if (event.key === '$' && !mathmode) {
    l = l.slice(0, c) + '$\\vert $' + l.slice(c + m);
  } else if (event.key === '^' && mathmode) {
    l = l.slice(0, c) + '^{' + cursor + '}' + l.slice(c + m);
  } else if (event.key === '_' && mathmode) {
    l = l.slice(0, c) + '_{' + cursor + '}' + l.slice(c + m);
  }
  // --- Autoreplacement logic ---
  if (isBackslash){
    let partial_latex = l.slice(l.indexOf('\\backslash '), l.indexOf('\\vert ') + 7);
    let new_latex = partial_latex.replace(pattern, match => replacements[match]);
    if (new_latex !== partial_latex) {
      isBackslash = false;
      l = l.slice(0, l.indexOf('\\backslash ')) + new_latex + l.slice(l.indexOf('\\vert ') + 7);
    }
  }

  // Update the active block's data and display
  activeBlock.dataset.latex = l;
  //activeBlock.innerHTML = l; // Show the raw text while editing
  updateCompilation(activeBlock); // Re-compile on every keystroke
});

// Set a default block to start with
createTextBlock();