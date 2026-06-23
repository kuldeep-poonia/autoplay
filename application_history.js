document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('emptyState');
    const exportBtn = document.getElementById('exportBtn');

    // Retrieve history from storage
    const storageResult = await new Promise(resolve => chrome.storage.local.get(['history'], resolve));
    const history = storageResult.history || [];

    if (history.length === 0) {
        emptyState.style.display = 'block';
    } else {
        history.reverse().forEach(app => {
            const row = document.createElement('tr');
            
            const companyTd = document.createElement('td');
            companyTd.textContent = app.company || 'Unknown Company';
            
            const roleTd = document.createElement('td');
            roleTd.textContent = app.role || 'Unknown Role';
            
            const dateTd = document.createElement('td');
            dateTd.textContent = new Date(app.date).toLocaleDateString();

            row.appendChild(companyTd);
            row.appendChild(roleTd);
            row.appendChild(dateTd);
            tbody.appendChild(row);
        });
    }

    exportBtn.addEventListener('click', () => {
        if (history.length === 0) return alert("No data to export.");
        
        let csv = "Company,Role,Date\n";
        history.forEach(app => {
            csv += `"${app.company}","${app.role}","${new Date(app.date).toISOString()}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'autoapply_history.csv';
        a.click();
        URL.revokeObjectURL(url);
    });
});
