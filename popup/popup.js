// Wait for the entire popup HTML to load before running any scripts
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. UI LOGIC: ACCORDIONS (DROPDOWNS)
    // ==========================================
    // Find all the clickable dropdown headers
    const headers = document.querySelectorAll('.accordion-header');

    headers.forEach(header => {
        // Listen for a click on each header
        header.addEventListener('click', () => {
            // Find the parent container of the clicked header
            const item = header.parentElement;
            
            // Toggle the 'active' class on and off. 
            // The CSS file sees this and shows/hides the content below it!
            item.classList.toggle('active');
        });
    });


    // ==========================================
    // 2. FEATURE LOGIC: TEAMMATE ZONES
    // ==========================================
    
    /* TEAMMATE 1: Dyslexia
    Grab your HTML elements by ID and add event listeners here.
    Example:
    document.getElementById('dyslexia-font-toggle').addEventListener('change', (e) => {
        // Save to storage and alert background scripts
    });
    */

    /* TEAMMATE 2: ADHD
    Grab your HTML elements by ID and add event listeners here.
    Example:
    document.getElementById('focus-ruler-toggle').addEventListener('change', (e) => {
        // Save to storage and alert background scripts
    });
    */

    /* TEAMMATE 3: Color Blindness
    Grab your HTML elements by ID and add event listeners here.
    */

});