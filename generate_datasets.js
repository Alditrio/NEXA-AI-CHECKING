const fs = require('fs');

const banks = ['Bank Jago', 'BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'OVO', 'Gopay', 'Dana'];

function randomAccount() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function randomBank() {
    return banks[Math.floor(Math.random() * banks.length)];
}

const datasets = [
    { name: 'Pola_Ukuran-Besar_Intensitas-Tinggi.txt', type: 'pattern', size: 'large' },
    { name: 'Transaksi_Ukuran-Besar_Intensitas-Tinggi.csv', type: 'trans', size: 'large' },
    { name: 'Akun_Ukuran-Besar_Intensitas-Tinggi.csv', type: 'account', size: 'large' },
    { name: 'Pola_Ukuran-Sedang_Intensitas-Tinggi.txt', type: 'pattern', size: 'medium' },
    { name: 'Transaksi_Ukuran-Sedang_Intensitas-Tinggi.csv', type: 'trans', size: 'medium' },
    { name: 'Akun_Ukuran-Sedang_Intensitas-Tinggi.csv', type: 'account', size: 'medium' },
    { name: 'Pola_Ukuran-Kecil_Intensitas-Tinggi.txt', type: 'pattern', size: 'small' },
    { name: 'Transaksi_Ukuran-Kecil_Intensitas-Tinggi.csv', type: 'trans', size: 'small' },
    { name: 'Akun_Ukuran-Kecil_Intensitas-Tinggi.csv', type: 'account', size: 'small' }
];

datasets.forEach(ds => {
    let content = '';
    const numRows = ds.size === 'large' ? 1000 : ds.size === 'medium' ? 500 : 100;
    
    if (ds.type === 'account') {
        // Just Account, Bank
        content += 'Account_Number,Bank_Name\n';
        for(let i=0; i<numRows; i++) {
            content += `${randomAccount()},${randomBank()}\n`;
        }
    } else if (ds.type === 'trans') {
        // Source, Dest, Amount, Timestamp
        content += 'Source_Account,Destination_Account,Amount_IDR,Timestamp\n';
        for(let i=0; i<numRows; i++) {
            let amount = ds.size === 'large' ? Math.floor(Math.random()*5000000000 + 1000000000) :
                         ds.size === 'medium' ? Math.floor(Math.random()*500000000 + 100000000) :
                         Math.floor(Math.random()*50000000 + 10000000);
            
            let formattedAmount = "Rp " + amount.toLocaleString('id-ID');
            content += `${randomAccount()},${randomAccount()},"${formattedAmount}",2026-05-25T10:00:00Z\n`;
        }
    } else if (ds.type === 'pattern') {
        // Logs / text
        for(let i=0; i<numRows; i++) {
            content += `[PATTERN] ${ds.size.toUpperCase()} INTENSITY DETECTED: Layering activity between ${randomAccount()} and ${randomAccount()} exceeding threshold.\n`;
        }
    }

    fs.writeFileSync(ds.name, content);
    console.log(`Generated: ${ds.name} (${numRows} rows)`);
});
