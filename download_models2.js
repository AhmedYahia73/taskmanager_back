const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'src', 'models', 'face-api');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

async function downloadModels() {
    https.get('https://api.github.com/repos/vladmandic/face-api/contents/model', {
        headers: { 'User-Agent': 'node.js' }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const files = JSON.parse(data);
            files.forEach(file => {
                if (file.name.includes('ssd_mobilenetv1') || file.name.includes('face_landmark_68') || file.name.includes('face_recognition')) {
                    const dest = path.join(modelsDir, file.name);
                    const fileStream = fs.createWriteStream(dest);
                    https.get(file.download_url, (response) => {
                        response.pipe(fileStream);
                        fileStream.on('finish', () => console.log(`Downloaded ${file.name}`));
                    });
                }
            });
        });
    });
}

downloadModels();
