async function check() {
    try {
        const res = await fetch('http://localhost:3010/billing/matrix?year=2026&month=2');
        console.log('Status:', res.status);
        const txt = await res.text();
        console.log('Body:', txt);
    } catch (e) { console.error(e); }
}
check();
