const fs = require('node:fs')
const path = require('node:path')
const QRCode = require('qrcode')

const vcard = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:王;一凡;;;',
  'FN:王一凡 / 小凡',
  'ORG:WANG YIFAN DESIGN',
  'TITLE:UI / UX / Visual Designer',
  'TEL;TYPE=CELL:+8619183977105',
  'EMAIL;TYPE=INTERNET:814606477@qq.com',
  'ADR;TYPE=WORK:;;四川 成都;;;;China',
  'NOTE:Portfolio contact card',
  'END:VCARD',
].join('\r\n')

QRCode.toString(
  vcard,
  {
    type: 'svg',
    width: 720,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#071006',
      light: '#bdfc5f',
    },
  },
  (error, svg) => {
    if (error) throw error
    const output = path.join(process.cwd(), 'public', 'contact-xiaofan-qr.svg')
    fs.writeFileSync(output, svg)
    console.log(`Generated ${output}`)
  },
)
