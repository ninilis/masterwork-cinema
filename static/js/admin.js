new Sortable(document.querySelector('#films-pool-list'), {
    group: { name: 'films', pull: 'clone', revertClone: false },
    sort: false,
    animation: 150
});
new Sortable(document.querySelector('#hall-1 .timeline-slots'), {
    group: { name: 'films', pull: true },
    onAdd: function(evt) { /* создание сеанса */ }
});
