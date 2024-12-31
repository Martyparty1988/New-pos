<?php
header('Content-Type: application/json');

try {
    // Získání dat z POST požadavku
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['villa']) || !isset($data['inventory'])) {
        throw new Exception('Chybějící data');
    }

    // Načtení současného stavu
    $jsonFile = 'data.json';
    $currentData = json_decode(file_get_contents($jsonFile), true);
    
    // Aktualizace inventáře pro danou vilu
    $currentData[$data['villa']] = $data['inventory'];
    
    // Uložení aktualizovaných dat
    if (file_put_contents($jsonFile, json_encode($currentData, JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true]);
    } else {
        throw new Exception('Chyba při ukládání dat');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>