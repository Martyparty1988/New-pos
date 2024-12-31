let inventory = {};
let selectedVilla = 'ohyeah';
let activeItemIndex = null;
let selectedCurrency = 'CZK';
let discountApplied = false;
let settings = {};

const popup = document.getElementById('quantity-popup');
const overlay = document.getElementById('overlay');
const input = document.getElementById('quantity-input');

// Načtení dat
async function loadJSON() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        inventory = data;
        settings = data.settings;
        loadItems(selectedVilla);
        updateSummary();
    } catch (error) {
        console.error('Chyba při načítání dat:', error);
        alert('Nepodařilo se načíst data. Prosím, obnovte stránku.');
    }
}

// Výběr vily
function selectVilla(villa) {
    const buttons = document.querySelectorAll('.villa-selection button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    selectedVilla = villa;
    localStorage.setItem('selectedVilla', villa);
    loadItems(villa);
    updateSummary();
}

// Načtení položek
function loadItems(villa) {
    const container = document.getElementById("items");
    container.innerHTML = '';

    inventory[villa].forEach((item, index) => {
        const price = selectedCurrency === 'CZK' ? 
            `${item.priceCZK} Kč` : 
            `${item.priceEUR} €`;
            
        container.innerHTML += `
            <div class="grid-item" onclick="showQuantityPopup(event, ${index}, '${item.name}')">
                <img src="images/${item.img}" alt="${item.name}">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${price}</div>
                <div class="stock">Skladem: ${item.stock}</div>
                <div class="bubble" id="item-count-${index}">0</div>
            </div>`;
    });
}

// Zobrazení popup pro zadání množství
function showQuantityPopup(event, index, itemName) {
    event.stopPropagation();
    activeItemIndex = index;
    
    const currentItem = inventory[selectedVilla][index];
    document.getElementById('popup-title').textContent = `${itemName} (Skladem: ${currentItem.stock})`;
    input.value = '1';
    input.max = currentItem.stock;
    
    popup.style.display = 'block';
    overlay.style.display = 'block';
    
    input.focus();
}

// Úprava množství v popup
function adjustQuantity(delta) {
    const currentValue = parseInt(input.value) || 0;
    const maxStock = inventory[selectedVilla][activeItemIndex].stock;
    input.value = Math.min(Math.max(1, currentValue + delta), maxStock);
}

// Potvrzení množství
function confirmQuantity() {
    if (activeItemIndex !== null) {
        const quantity = parseInt(input.value) || 0;
        const maxStock = inventory[selectedVilla][activeItemIndex].stock;
        
        if (quantity > 0 && quantity <= maxStock) {
            const bubble = document.getElementById(`item-count-${activeItemIndex}`);
            bubble.textContent = quantity;
            bubble.classList.add('active');
            updateSummary();
        } else {
            alert('Nedostatečné množství na skladě!');
        }
    }
    closePopup();
}

// Zavření popup
function closePopup() {
    popup.style.display = 'none';
    overlay.style.display = 'none';
    activeItemIndex = null;
}

// Přepínání měny
function setCurrency(currency) {
    const buttons = document.querySelectorAll('.currency-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.textContent === currency);
    });
    
    selectedCurrency = currency;
    loadItems(selectedVilla);
    updateSummary();
}

// Přepínání slevy
function toggleDiscount() {
    discountApplied = document.getElementById('discount').checked;
    document.getElementById('discount-row').style.display = discountApplied ? 'flex' : 'none';
    updateSummary();
}

// Výpočet City Tax
function calculateCityTax() {
    const guests = parseInt(document.getElementById('guests').value) || 0;
    const nights = parseInt(document.getElementById('nights').value) || 0;
    return guests * nights * settings.cityTaxEUR;
}

// Výpočet celkové ceny
function calculateTotal() {
    let subtotalCZK = 0;
    let subtotalEUR = 0;

    // Součet položek
    inventory[selectedVilla].forEach((item, index) => {
        const quantity = parseInt(document.getElementById(`item-count-${index}`)?.textContent) || 0;
        subtotalCZK += item.priceCZK * quantity;
        subtotalEUR += item.priceEUR * quantity;
    });

    // Přidání wellness
    const wellnessEUR = parseFloat(document.getElementById('wellness').value) || 0;
    subtotalEUR += wellnessEUR;
    subtotalCZK += wellnessEUR * settings.exchangeRate;

    // Výpočet slevy
    let discountCZK = 0;
    let discountEUR = 0;
    if (discountApplied) {
        discountCZK = subtotalCZK * (settings.discountPercent / 100);
        discountEUR = subtotalEUR * (settings.discountPercent / 100);
    }

    // City Tax (vždy v EUR)
    const cityTaxEUR = calculateCityTax();

    // Konečné součty
    const totalEUR = subtotalEUR - discountEUR + cityTaxEUR;
    const totalCZK = subtotalCZK - discountCZK + (cityTaxEUR * settings.exchangeRate);

    return {
        subtotalCZK,
        subtotalEUR,
        discountCZK,
        discountEUR,
        cityTaxEUR,
        totalCZK,
        totalEUR
    };
}

// Aktualizace souhrnu
function updateSummary() {
    const totals = calculateTotal();
    const subtotalEl = document.getElementById('subtotal');
    const cityTaxEl = document.getElementById('citytax');
    const discountEl = document.getElementById('discount-amount');
    const totalEl = document.getElementById('total');

    if (selectedCurrency === 'CZK') {
        subtotalEl.textContent = `${totals.subtotalCZK.toFixed(2)} Kč`;
        discountEl.textContent = `${totals.discountCZK.toFixed(2)} Kč`;
        totalEl.textContent = `${totals.totalCZK.toFixed(2)} Kč`;
    } else {
        subtotalEl.textContent = `${totals.subtotalEUR.toFixed(2)} €`;
        discountEl.textContent = `${totals.discountEUR.toFixed(2)} €`;
        totalEl.textContent = `${totals.totalEUR.toFixed(2)} €`;
    }
    
    cityTaxEl.textContent = `${totals.cityTaxEUR.toFixed(2)} €`;
}

// Generování faktury
function generateInvoice() {
    const totals = calculateTotal();
    const invoiceData = {
        villa: selectedVilla,
        items: inventory[selectedVilla].map((item, index) => ({
            name: item.name,
            quantity: parseInt(document.getElementById(`item-count-${index}`)?.textContent) || 0,
            priceCZK: item.priceCZK,
            priceEUR: item.priceEUR
        })).filter(item => item.quantity > 0),
        wellness: parseFloat(document.getElementById('wellness').value) || 0,
        guests: parseInt(document.getElementById('guests').value) || 0,
        nights: parseInt(document.getElementById('nights').value) || 0,
        discountApplied,
        selectedCurrency,
        cityTaxEUR: totals.cityTaxEUR,
        totals,
        timestamp: new Date().toISOString()
    };

    // Uložení dat faktury
    localStorage.setItem('invoice', JSON.stringify(invoiceData));
    
    // Aktualizace skladu
    updateInventory(invoiceData.items);
    
    // Přesměrování na fakturu
    window.location.href = 'faktura.html';
}

// Aktualizace skladu
async function updateInventory(purchasedItems) {
    purchasedItems.forEach(item => {
        const inventoryItem = inventory[selectedVilla].find(i => i.name === item.name);
        if (inventoryItem) {
            inventoryItem.stock -= item.quantity;
        }
    });

    try {
        const response = await fetch('update_inventory.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ villa: selectedVilla, inventory: inventory[selectedVilla] })
        });
        
        if (!response.ok) {
            throw new Error('Chyba při aktualizaci skladu');
        }
    } catch (error) {
        console.error('Chyba při aktualizaci skladu:', error);
        alert('Nepodařilo se aktualizovat sklad. Zkontrolujte stav skladu ručně.');
    }
}

// Event listeners
overlay.addEventListener('click', closePopup);

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        confirmQuantity();
    } else if (e.key === 'Escape') {
        closePopup();
    }
});

// Event listeners pro automatickou aktualizaci souhrnu
document.getElementById('guests').addEventListener('input', updateSummary);
document.getElementById('nights').addEventListener('input', updateSummary);
document.getElementById('wellness').addEventListener('input', updateSummary);

// Inicializace
window.onload = function() {
    loadJSON();
    
    // Obnovení poslední vybrané vily
    const lastVilla = localStorage.getItem('selectedVilla');
    if (lastVilla) {
        selectVilla(lastVilla);
    }
};