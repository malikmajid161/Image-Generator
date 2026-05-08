

async function test() {
    const prompts = ["cat", "dog"];
    const urls = [
        "https://image.pollinations.ai/prompt/cat?width=1024&height=1024&nologo=true",
        "https://gen.pollinations.ai/image/cat?width=1024&height=1024&nologo=true",
        "https://pollinations.ai/p/cat?width=1024&height=1024&nologo=true"
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`URL: ${url} | Status: ${res.status}`);
        } catch (e) {
            console.log(`URL: ${url} | Error: ${e.message}`);
        }
    }
    
    // Test text
    try {
        const textRes = await fetch("https://text.pollinations.ai/hello?model=openai");
        const text = await textRes.text();
        console.log(`Text API Result: ${text.slice(0, 50)}...`);
    } catch (e) {
        console.log(`Text API Error: ${e.message}`);
    }
}

test();
