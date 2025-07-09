try {
    require('puppeteer');
    console.log('✅ SUCCESS: Puppeteer was loaded correctly!');
} catch (e) {
    console.error('🔴 FAILED: Could not load Puppeteer. Here is the specific error:');
    console.error(e);
}