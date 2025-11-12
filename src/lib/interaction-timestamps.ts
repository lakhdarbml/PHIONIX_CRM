import fs from 'fs';
import path from 'path';

const TIMESTAMPS_FILE = path.join(process.cwd(), 'data', 'interaction-timestamps.json');

// Ensure the data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Initialize timestamps file if it doesn't exist
if (!fs.existsSync(TIMESTAMPS_FILE)) {
    fs.writeFileSync(TIMESTAMPS_FILE, JSON.stringify({}, null, 2));
}

export interface InteractionTimestamp {
    lastUpdate: string;  // ISO date string
    lastMessageId: number;
}

export interface TimestampData {
    [interactionId: string]: InteractionTimestamp;
}

export function getLastUpdateTime(interactionId: string): InteractionTimestamp | null {
    try {
        const data = JSON.parse(fs.readFileSync(TIMESTAMPS_FILE, 'utf-8')) as TimestampData;
        return data[interactionId] || null;
    } catch (error) {
        console.error('Error reading timestamps file:', error);
        return null;
    }
}

export function updateLastInteractionTime(interactionId: string, lastMessageId: number): void {
    try {
        const data = JSON.parse(fs.readFileSync(TIMESTAMPS_FILE, 'utf-8')) as TimestampData;
        data[interactionId] = {
            lastUpdate: new Date().toISOString(),
            lastMessageId
        };
        fs.writeFileSync(TIMESTAMPS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error updating timestamps file:', error);
    }
}