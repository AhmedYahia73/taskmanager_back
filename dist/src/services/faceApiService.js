"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareFaceDescriptors = exports.extractFaceDescriptorFromBase64 = exports.extractFaceDescriptor = exports.loadModels = void 0;
const canvas = __importStar(require("canvas"));
const faceapi = __importStar(require("@vladmandic/face-api"));
const path_1 = __importDefault(require("path"));
// Patch Nodejs environment for face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
let modelsLoaded = false;
const loadModels = async () => {
    if (modelsLoaded)
        return;
    try {
        const modelsPath = path_1.default.join(process.cwd(), 'src', 'models', 'face-api');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
        modelsLoaded = true;
        console.log('Face API models loaded successfully');
    }
    catch (error) {
        console.error('Error loading Face API models:', error);
    }
};
exports.loadModels = loadModels;
/**
 * Extracts a 128-dimensional face descriptor from an image file path.
 * Returns the Float32Array as an array of numbers.
 */
const extractFaceDescriptor = async (imagePath) => {
    try {
        await (0, exports.loadModels)();
        const img = await canvas.loadImage(imagePath);
        const detection = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (detection) {
            return Array.from(detection.descriptor);
        }
        return null; // No face detected
    }
    catch (error) {
        console.error('Error extracting face descriptor:', error);
        return null;
    }
};
exports.extractFaceDescriptor = extractFaceDescriptor;
/**
 * Extracts a 128-dimensional face descriptor from a base64 image string (e.g. from a webcam snapshot).
 */
const extractFaceDescriptorFromBase64 = async (base64Image) => {
    try {
        await (0, exports.loadModels)();
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const img = await canvas.loadImage(buffer);
        const detection = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (detection) {
            return Array.from(detection.descriptor);
        }
        return null;
    }
    catch (error) {
        console.error('Error extracting face descriptor from Base64:', error);
        return null;
    }
};
exports.extractFaceDescriptorFromBase64 = extractFaceDescriptorFromBase64;
/**
 * Compares two descriptors and returns true if they match (Euclidean distance < threshold)
 */
const compareFaceDescriptors = (descriptor1, descriptor2, threshold = 0.6) => {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== 128 || descriptor2.length !== 128) {
        return false;
    }
    // Convert arrays back to Float32Array for face-api
    const desc1 = new Float32Array(descriptor1);
    const desc2 = new Float32Array(descriptor2);
    const distance = faceapi.euclideanDistance(desc1, desc2);
    return distance < threshold;
};
exports.compareFaceDescriptors = compareFaceDescriptors;
