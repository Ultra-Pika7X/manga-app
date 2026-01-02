
```
import axios from 'axios';
import fs from 'fs';

const TEST_URL = 'https://avt.mkklcdnv6temp.com/fld/25/r/14498-17636.jpg';

async function testProxyLogic() {
    console.log(`Attempting to fetch with NO REFERER: ${ TEST_URL } `);
    try {
        const response = await axios.get(TEST_URL, {
            headers: {
                'Referer': '', // Explicitly empty
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            responseType: 'arraybuffer',
            timeout: 10000 
        });

        console.log(`Status: ${ response.status } `);
        console.log(`Size: ${ response.data.length } bytes`);
        
        fs.writeFileSync('test-image-noref.jpg', response.data);
        console.log('Saved to test-image-noref.jpg');

    } catch (error: any) {
        console.error('Fetch failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
}

testProxyLogic();
```
