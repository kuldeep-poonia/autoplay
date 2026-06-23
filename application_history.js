document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('emptyState');
    const exportBtn = document.getElementById('exportBtn');
    const headers = document.querySelectorAll('th[data-sort]');
    
    let historyData = [];
    let sortCol = 'date';
    let sortDesc = true;

    // Retrieve history from storage
    const storageResult = await new Promise(resolve => chrome.storage.local.get(['history'], resolve));
    historyData = storageResult.history || [];

    function renderTable() {
        tbody.innerHTML = '';
        if (historyData.length === 0) {
            emptyState.style.display = 'block';
            document.getElementById('historyTable').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.getElementById('historyTable').style.display = 'table';

        // Sort data
        const sortedData = [...historyData].sort((a, b) => {
            let valA = a[sortCol] || '';
            let valB = b[sortCol] || '';
            if (sortCol === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }
            if (valA < valB) return sortDesc ? 1 : -1;
            if (valA > valB) return sortDesc ? -1 : 1;
            return 0;
        });

        sortedData.forEach(app => {
            const row = document.createElement('tr');
            
            const companyTd = document.createElement('td');
            companyTd.textContent = app.company || 'Unknown Company';
            
            const roleTd = document.createElement('td');
            roleTd.textContent = app.role || 'Unknown Role';

            const statusTd = document.createElement('td');
            const select = document.createElement('select');
            select.className = 'status-select';
            ['Applied', 'Interview', 'Offer', 'Rejected'].forEach(status => {
                const opt = document.createElement('option');
                opt.value = status;
                opt.textContent = status;
                if ((app.status || 'Applied') === status) opt.selected = true;
                select.appendChild(opt);
            });
            select.addEventListener('change', async (e) => {
                app.status = e.target.value;
                // Save to storage
                const originalIndex = historyData.findIndex(h => h.id === app.id);
                if (originalIndex > -1) {
                    historyData[originalIndex].status = app.status;
                } else {
                    // Fallback for older items without ID
                    const oldIndex = historyData.findIndex(h => h.company === app.company && h.date === app.date);
                    if (oldIndex > -1) historyData[oldIndex].status = app.status;
                }
                await new Promise(resolve => chrome.storage.local.set({ history: historyData }, resolve));
            });
            statusTd.appendChild(select);
            
            const dateTd = document.createElement('td');
            dateTd.textContent = new Date(app.date).toLocaleDateString();

            row.appendChild(companyTd);
            row.appendChild(roleTd);
            row.appendChild(statusTd);
            row.appendChild(dateTd);
            tbody.appendChild(row);
        });
    }

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (sortCol === col) {
                sortDesc = !sortDesc;
            } else {
                sortCol = col;
                sortDesc = false; // default asc for new col
                if (col === 'date') sortDesc = true;
            }
            renderTable();
        });
    });

    renderTable();

    exportBtn.addEventListener('click', () => {
        if (historyData.length === 0) return alert("No data to export.");
        
        let csv = "Company,Role,Status,Date\n";
        historyData.forEach(app => {
            csv += `"${app.company}","${app.role}","${app.status || 'Applied'}","${new Date(app.date).toISOString()}"\n`;
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
