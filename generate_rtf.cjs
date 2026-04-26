
const fs = require('fs');

function generateRTF(content) {
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}';
    rtf += '\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24 ';
    
    // Simple replacement for basic formatting
    let cleanContent = content
        .replace(/<h1>(.*?)<\/h1>/g, '\\b\\fs36 $1\\b0\\fs24\\par ')
        .replace(/<h3>(.*?)<\/h3>/g, '\\b\\fs28 $1\\b0\\fs24\\par ')
        .replace(/<strong>(.*?)<\/strong>/g, '\\b $1\\b0 ')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '')
        .replace(/<li>(.*?)<\/li>/g, '\\bullet  $1\\par ')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\\par ')
        .replace(/<br>/g, '\\par ')
        .replace(/<span class="highlight">(.*?)<\/span>/g, '\\b $1\\b0 ')
        .replace(/<hr>/g, '\\line\\line ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, '\\\'e1')
        .replace(/&eacute;/g, '\\\'e9')
        .replace(/&iacute;/g, '\\\'ed')
        .replace(/&oacute;/g, '\\\'f3')
        .replace(/&uacute;/g, '\\\'fa')
        .replace(/&atilde;/g, '\\\'e3')
        .replace(/&otilde;/g, '\\\'f5')
        .replace(/&ccedil;/g, '\\\'e7')
        .replace(/&Aacute;/g, '\\\'c1')
        .replace(/&Eacute;/g, '\\\'c9')
        .replace(/&Iacute;/g, '\\\'cd')
        .replace(/&Oacute;/g, '\\\'d3')
        .replace(/&Uacute;/g, '\\\'da')
        .replace(/&Atilde;/g, '\\\'c3')
        .replace(/&Otilde;/g, '\\\'d5')
        .replace(/&Ccedil;/g, '\\\'c7');

    // Remove remaining HTML tags
    cleanContent = cleanContent.replace(/<[^>]*>/g, '');
    
    rtf += cleanContent + '}';
    return rtf;
}

const htmlContent = fs.readFileSync('C:\\Users\\Master\\Desktop\\Contrato_BJL_Premium.docx', 'utf8');
const rtfContent = generateRTF(htmlContent);
fs.writeFileSync('C:\\Users\\Master\\Desktop\\Contrato_BJL_Premium.rtf', rtfContent);
