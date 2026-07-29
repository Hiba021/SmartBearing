document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('featureImportanceChart').getContext('2d');

  // Colors matching the premium UI theme
  const gradient1 = ctx.createLinearGradient(0, 0, 800, 0);
  gradient1.addColorStop(0, 'rgba(16, 185, 129, 0.8)'); // emerald
  gradient1.addColorStop(1, 'rgba(5, 150, 105, 1)');

  const gradient2 = ctx.createLinearGradient(0, 0, 800, 0);
  gradient2.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // indigo
  gradient2.addColorStop(1, 'rgba(67, 56, 202, 1)');
  
  const defaultGradient = ctx.createLinearGradient(0, 0, 800, 0);
  defaultGradient.addColorStop(0, 'rgba(148, 163, 184, 0.5)'); // slate
  defaultGradient.addColorStop(1, 'rgba(100, 116, 139, 0.8)');

  const data = {
    labels: ['RMS', 'Kurtosis', 'Crest Factor', 'Standard Dev', 'Mean', 'Max', 'Min', 'Skewness', 'Form Factor'],
    datasets: [{
      label: 'Gini Importance Score',
      data: [0.31, 0.24, 0.18, 0.11, 0.05, 0.04, 0.03, 0.02, 0.02],
      backgroundColor: [
        gradient1,       // RMS
        gradient2,       // Kurtosis
        defaultGradient, // Crest Factor
        defaultGradient, // Standard Dev
        defaultGradient, // Mean
        defaultGradient, // Max
        defaultGradient, // Min
        defaultGradient, // Skewness
        defaultGradient  // Form Factor
      ],
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.6
    }]
  };

  const config = {
    type: 'bar',
    data: data,
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0F172A',
          titleFont: { size: 13, family: "'Courier New', Courier, monospace" },
          bodyFont: { size: 14, weight: 'bold' },
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return 'Importance: ' + context.parsed.x.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: '#E2E8F0',
            drawBorder: false,
            borderDash: [5, 5]
          },
          ticks: {
            font: { family: "'Courier New', Courier, monospace", size: 12 },
            color: '#64748B'
          },
          title: {
            display: true,
            text: 'Gini Importance Score (0.0 to 1.0)',
            color: '#94A3B8',
            font: { weight: 'bold' }
          },
          max: 0.35
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { weight: 'bold', size: 12 },
            color: '#1E293B'
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  };

  new Chart(ctx, config);
});
