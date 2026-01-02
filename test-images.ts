
import axios from 'axios';

const TEST_IMAGE_URL = 'https://avt.mkklcdnv6temp.com/fld/25/r/14498-17636.jpg'; // Example Mangakakalot image (Solo Leveling)
const PROXY_URL = `https://wsrv.nl/?url=${encodeURIComponent(TEST_IMAGE_URL)}`;

async function testImages() {
    console.log('Testing Direct Access:');
    try {
        const res1 = await axios.get(TEST_IMAGE_URL, {
            headers: { 'Referer': 'https://mangakakalot.com' },
            responseType: 'arraybuffer' // Just to check connectivity
        });
        console.log(`Direct: Status ${res1.status}, Size ${res1.data.length}`);
    } catch (e: any) {
        console.log(`Direct: Failed - ${e.message}`);
    }

    console.log('\nTesting Proxy Access (wsrv.nl):');
    try {
        const res2 = await axios.get(PROXY_URL, { responseType: 'arraybuffer' });
        console.log(`Proxy: Status ${res2.status}, Size ${res2.data.length}`);
    } catch (e: any) {
        console.log(`Proxy: Failed - ${e.message}`);
    }
}

testImages();
