const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'src', 'models', 'face-api');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

function downloadFile(file) {
    return new Promise((resolve, reject) => {
        const dest = path.join(modelsDir, file);
        if (fs.existsSync(dest)) {
            console.log(`${file} already exists`);
            return resolve();
        }
        console.log(`Downloading ${file}...`);
        const fileStream = fs.createWriteStream(dest);
        https.get(baseUrl + file, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download ${file} (status code ${response.statusCode})`));
            }
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${file}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function downloadAll() {
    for (const file of files) {
        await downloadFile(file);
    }
    console.log("All models downloaded successfully.");
}

downloadAll().catch(console.error);
