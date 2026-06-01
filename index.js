// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const AGENCIES = ['Subway','Bus','NYCT Bus','MTA Bus','LIRR','MNR','AAR','BT','B&T','SIR'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const COLORS = {
  'Subway':   '#c8963e',
  'Bus':      '#4a9eca',
  'NYCT Bus': '#7bc67e',
  'MTA Bus':  '#e07b7b',
  'LIRR':     '#b07fd4',
  'MNR':      '#e0a84a',
  'AAR':      '#5ecec8',
  'BT':       '#e08a4a',
  'B&T':      '#a0c4e8',
  'SIR':      '#d4a0c8',
};

const ANALYSIS = {
  'ALL': {
    2020: "By April 2020, the MTA experienced a 90% decrease in subway and bus ridership and a 95% decrease in commuter rail passengers. The MTA faced a cumulative $16.2 billion budget gap from 2020 through 2024 as a result of lost farebox revenue and $567M in unplanned COVID cleaning costs in 2020 alone. (Source: CBC Testimony, Denise Richardson)",
    2019: "2019 was the last full pre-pandemic year. Use the Peak Year button on each agency to compare how far each mode's ridership still is from its pre-pandemic high.",
    2022: "Even with ridership returning, the MTA projected a $1.8 billion structural gap even under a full ridership recovery scenario, meaning fare revenue alone could not close the deficit created by the pandemic.",
    2025: "2025 represents the MTA's strongest post-pandemic ridership year in this dataset. Compare to 2019 using the Peak Year button to see how much ground has been recovered.",
  },
  'Subway': {
    2020: "Subway ridership fell 90% by April 2020. The MTA estimated COVID-related cleaning costs of $567M in 2020, $591M in 2021, $518M in 2022, and $500M annually through 2024. (Source: CBC Testimony)",
    2019: "2019 was the subway's peak year in this dataset. Drag the slider forward to watch the collapse in 2020 and the slow recovery through 2025.",
    2025: "The MTA's 2025–2029 Capital Plan allocated $11.93B to passenger stations and $7.2B to subway cars, the ninth capital plan in MTA history.",
  },
  'Bus': {
    2020: "Bus ridership dropped 90% alongside the subway in April 2020, though toll traffic was more resilient (only 15% below pre-pandemic levels at the same time), reflecting that essential drivers returned to roads faster than transit riders. (Source: CBC Testimony)",
    2019: "2019 was the last full pre-pandemic year for bus ridership. Note that bus recovery post-2020 has been slower than subway recovery, which is visible by comparing their respective Peak Year readings.",
  },
  'LIRR': {
    2020: "Commuter rail saw the steepest drop of any MTA mode: a 95% decrease in passengers by April 2020, compared to 90% for subway and bus. This reflects commuter rail's near-total dependence on Manhattan office trips. (Source: CBC Testimony)",
  },
  'MNR': {
    2020: "Like the LIRR, Metro-North experienced a 95% ridership decline by April 2020. Toll traffic on bridges and tunnels recovered much faster, dropping only 15% at the same point. This stark contrast is visible across the agency tabs.",
  },
  'BT': {
    2020: "Bridge and tunnel traffic fell 65% by April 2020, far less than the 90–95% drops seen on transit. By mid-2020, tolls were only 15% below pre-pandemic levels, making B&T the MTA's most financially resilient revenue source during the crisis. (Source: CBC Testimony)",
  },
};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

let allData = [],
    activeAgency = 'Subway',
    activeYear = 2024;

let globalMax = 0,
    chartBuilt = false;

let agencyYearRanges = {};
let svg, xScale, yScale, lineGen, areaGen;

const margin = { top: 20, right: 20, bottom: 36, left: 64 };
const height = 340 - margin.top - margin.bottom;

// ═══════════════════════════════════════════
// BUTTONS
// ═══════════════════════════════════════════

const btnContainer = document.getElementById('mode-buttons');

const allBtn = document.createElement('button');
allBtn.className = 'mode-btn';
allBtn.textContent = 'All';
allBtn.addEventListener('click', () => {
  activeAgency = 'ALL';
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  allBtn.classList.add('active');
  updateSliderRange();
  updateGlobalMax();
  render();
});
btnContainer.appendChild(allBtn);

AGENCIES.forEach(agency => {
  const btn = document.createElement('button');
  btn.className = 'mode-btn' + (agency === activeAgency ? ' active' : '');
  btn.textContent = agency;
  btn.addEventListener('click', () => {
    activeAgency = agency;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateSliderRange();
    updateGlobalMax();
    render();
  });
  btnContainer.appendChild(btn);
});

// ═══════════════════════════════════════════
// SLIDER
// ═══════════════════════════════════════════

const slider = document.getElementById('year-slider');
const yearDisplay = document.getElementById('year-display');

slider.addEventListener('input', () => {
  activeYear = +slider.value;
  yearDisplay.textContent = activeYear;
  render();
});

// ═══════════════════════════════════════════
// LOAD CSV
// ═══════════════════════════════════════════

d3.csv(
  "data/MTA_Monthly_Ridership___Traffic_Data__Beginning_January_2008_20260517.csv",
  d => {
    const date = new Date(d.Month);
    return {
      date,
      year:      date.getFullYear(),
      month:     date.getMonth(),
      agency:    d.Agency ? d.Agency.trim() : '',
      ridership: +String(d.Ridership).replace(/,/g, '') || 0
    };
  }
).then(parsed => {

  allData = parsed.filter(d => !isNaN(d.date) && d.ridership > 0);

  AGENCIES.forEach(agency => {
    const agencyYears = allData.filter(d => d.agency === agency).map(d => d.year);
    if (agencyYears.length) {
      agencyYearRanges[agency] = {
        min: d3.min(agencyYears),
        max: d3.max(agencyYears)
      };
    }
  });

  const allYears = allData.map(d => d.year);
  agencyYearRanges['ALL'] = {
    min: d3.min(allYears),
    max: d3.max(allYears)
  };

  activeYear = agencyYearRanges['Subway'].max;

  updateSliderRange();
  updateGlobalMax();
  buildChart();
  render();
  initScrollytelling();
});


// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function updateSliderRange() {
  const range = agencyYearRanges[activeAgency] || agencyYearRanges['ALL'];
  slider.min = range.min;
  slider.max = range.max;
  document.getElementById('slider-min').textContent = range.min;
  document.getElementById('slider-max').textContent = range.max;
  if (activeYear < range.min) activeYear = range.min;
  if (activeYear > range.max) activeYear = range.max;
  slider.value = activeYear;
  yearDisplay.textContent = activeYear;
}

function updateGlobalMax() {
  if (activeAgency === 'ALL') {
    globalMax = d3.max(allData, d => d.ridership) || 1;
  } else {
    globalMax = d3.max(allData.filter(d => d.agency === activeAgency), d => d.ridership) || 1;
  }
}

function getPeakYear(agency) {
  if (agency === 'ALL') {
    const byYear = d3.rollup(allData, v => d3.sum(v, d => d.ridership), d => d.year);
    return [...byYear.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }
  const agencyData = allData.filter(d => d.agency === agency);
  if (!agencyData.length) return null;
  const byYear = d3.rollup(agencyData, v => d3.sum(v, d => d.ridership), d => d.year);
  return [...byYear.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

function updateAnalysis() {
  const callout = document.getElementById('analysis-callout');
  const textEl  = document.getElementById('analysis-text');
  const agencyNotes = ANALYSIS[activeAgency] || ANALYSIS['ALL'];
  const note = agencyNotes?.[activeYear];
  if (note) {
    textEl.textContent = note;
    callout.style.display = 'flex';
    callout.style.animation = 'none';
    callout.offsetHeight;
    callout.style.animation = '';
  } else {
    callout.style.display = 'none';
  }
}

// ═══════════════════════════════════════════
// PEAK YEAR BUTTON
// ═══════════════════════════════════════════

document.getElementById('peak-btn').addEventListener('click', () => {
  const peak = getPeakYear(activeAgency);
  if (!peak) return;
  activeYear = peak;
  slider.value = peak;
  yearDisplay.textContent = peak;
  updateGlobalMax();
  render();
  document.getElementById('peak-label').textContent =
    `Peak year for ${activeAgency === 'ALL' ? 'all agencies' : activeAgency}: ${peak}`;
});

// ═══════════════════════════════════════════
// BUILD CHART
// ═══════════════════════════════════════════

function buildChart() {

  document.getElementById('chart').innerHTML = '';

  const W      = document.querySelector('.viz-block').clientWidth - 40;
  const innerW = W - margin.left - margin.right;

  svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} 340`)
    .attr('width', W)
    .attr('height', 340);

  const defs = svg.append('defs');
  const grad = defs.append('linearGradient')
    .attr('id','areaGradient')
    .attr('x1','0').attr('y1','0')
    .attr('x2','0').attr('y2','1');
  grad.append('stop').attr('offset','0%').attr('stop-color','#c8963e').attr('stop-opacity',0.25);
  grad.append('stop').attr('offset','100%').attr('stop-color','#c8963e').attr('stop-opacity',0.02);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  xScale = d3.scalePoint()
    .domain(MONTH_NAMES)
    .range([0, innerW])
    .padding(0.1);

  yScale = d3.scaleLinear()
    .domain([0, globalMax * 1.08])
    .range([height, 0]);

  g.append('g').attr('class','grid')
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(''));

  g.append('g').attr('class','axis')
    .attr('transform',`translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(0).tickPadding(10));

  g.append('g').attr('class','axis y-axis')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d =>
      d >= 1e6 ? (d/1e6).toFixed(1)+'M' :
      d >= 1e3 ? (d/1e3).toFixed(0)+'K' : d
    ));

  lineGen = d3.line()
    .x(d => xScale(MONTH_NAMES[d.month]))
    .y(d => yScale(d.ridership))
    .curve(d3.curveCatmullRom.alpha(0.5));

  areaGen = d3.area()
    .x(d => xScale(MONTH_NAMES[d.month]))
    .y0(height)
    .y1(d => yScale(d.ridership))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.append('path').attr('class','area-path').attr('id','area-path');
  g.append('path').attr('class','line-path').attr('id','line-path');
  g.append('g').attr('id','dots-group');

  chartBuilt = true;
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════

function render() {

  if (!chartBuilt) return;

  const g = svg.select('g');

  yScale.domain([0, globalMax * 1.08]);

  d3.select('.y-axis').call(
    d3.axisLeft(yScale).ticks(5).tickFormat(d =>
      d >= 1e6 ? (d/1e6).toFixed(1)+'M' :
      d >= 1e3 ? (d/1e3).toFixed(0)+'K' : d
    )
  );

  g.selectAll('.agency-line-group').remove();
  d3.select('#legend').remove();

  // ── ALL MODE ──
  if (activeAgency === 'ALL') {

    d3.select('#line-path').attr('d', null);
    d3.select('#area-path').attr('d', null);
    d3.select('#dots-group').selectAll('circle').remove();

    const yearlyTotal = d3.sum(
      allData.filter(d => d.year === activeYear),
      d => d.ridership
    );

    const totalEl = document.getElementById('annual-total');
    if (totalEl) {
      totalEl.textContent =
        yearlyTotal >= 1e9 ? (yearlyTotal/1e9).toFixed(2)+'B total riders' :
        yearlyTotal >= 1e6 ? (yearlyTotal/1e6).toFixed(1)+'M total riders' :
        yearlyTotal.toLocaleString()+' total riders';
    }

    AGENCIES.forEach(agency => {
      const yearData = allData
        .filter(d => d.agency === agency && d.year === activeYear)
        .sort((a,b) => a.month - b.month);
      if (!yearData.length) return;

      const agGroup = g.append('g').attr('class','agency-line-group');

      agGroup.append('path')
        .datum(yearData)
        .attr('fill','none')
        .attr('stroke', COLORS[agency] || '#fff')
        .attr('stroke-width', 2)
        .attr('stroke-linecap','round')
        .attr('stroke-linejoin','round')
        .attr('d', lineGen);

      agGroup.selectAll('circle')
        .data(yearData)
        .enter()
        .append('circle')
        .attr('r', 3.5)
        .attr('cx', d => xScale(MONTH_NAMES[d.month]))
        .attr('cy', d => yScale(d.ridership))
        .attr('fill', COLORS[agency] || '#fff')
        .attr('stroke', '#112236')
        .attr('stroke-width', 1.5)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 6);
          const tt = document.getElementById('tooltip');
          document.getElementById('tt-month').textContent = agency+' · '+MONTH_NAMES[d.month]+' '+d.year;
          document.getElementById('tt-val').textContent = d.ridership.toLocaleString()+' riders';
          tt.style.opacity = 1;
          const rect = document.querySelector('.chart-container').getBoundingClientRect();
          tt.style.left = (event.clientX - rect.left + 12)+'px';
          tt.style.top  = (event.clientY - rect.top  - 36)+'px';
        })
        .on('mousemove', function(event) {
          const rect = document.querySelector('.chart-container').getBoundingClientRect();
          const tt = document.getElementById('tooltip');
          tt.style.left = (event.clientX - rect.left + 12)+'px';
          tt.style.top  = (event.clientY - rect.top  - 36)+'px';
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 3.5);
          document.getElementById('tooltip').style.opacity = 0;
        });
    });

    const legend = d3.select('.chart-container').append('div').attr('id','legend');
    AGENCIES.forEach(agency => {
      const item = legend.append('div').attr('class','legend-item');
      item.append('span').attr('class','legend-dot').style('background', COLORS[agency] || '#fff');
      item.append('span').attr('class','legend-label').text(agency);
    });

    updateAnalysis();

  // ── SINGLE AGENCY MODE ──
  } else {

    const yearData = allData
      .filter(d => d.agency === activeAgency && d.year === activeYear)
      .sort((a,b) => a.month - b.month);

    if (!yearData.length) {
      d3.select('#line-path').attr('d', null);
      d3.select('#area-path').attr('d', null);
      d3.select('#dots-group').selectAll('circle').remove();
      document.getElementById('annual-total').textContent = '—';
      return;
    }

    const total = d3.sum(yearData, d => d.ridership);
    document.getElementById('annual-total').textContent =
      total >= 1e9 ? (total/1e9).toFixed(2)+'B' :
      total >= 1e6 ? (total/1e6).toFixed(1)+'M' :
      total.toLocaleString();

    d3.select('#line-path')
      .datum(yearData)
      .transition().duration(300).ease(d3.easeCubicOut)
      .attr('d', lineGen);

    d3.select('#area-path')
      .datum(yearData)
      .transition().duration(300).ease(d3.easeCubicOut)
      .attr('d', areaGen);

    const dots = d3.select('#dots-group').selectAll('circle').data(yearData, d => d.month);

    dots.enter()
      .append('circle')
      .attr('class','dot')
      .attr('r', 4)
      .attr('cx', d => xScale(MONTH_NAMES[d.month]))
      .attr('cy', d => yScale(d.ridership))
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6);
        const tt = document.getElementById('tooltip');
        document.getElementById('tt-month').textContent = MONTH_NAMES[d.month]+' '+d.year;
        document.getElementById('tt-val').textContent = d.ridership.toLocaleString()+' riders';
        tt.style.opacity = 1;
        const rect = document.querySelector('.chart-container').getBoundingClientRect();
        tt.style.left = (event.clientX - rect.left + 12)+'px';
        tt.style.top  = (event.clientY - rect.top  - 36)+'px';
      })
      .on('mousemove', function(event) {
        const rect = document.querySelector('.chart-container').getBoundingClientRect();
        const tt = document.getElementById('tooltip');
        tt.style.left = (event.clientX - rect.left + 12)+'px';
        tt.style.top  = (event.clientY - rect.top  - 36)+'px';
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 4);
        document.getElementById('tooltip').style.opacity = 0;
      })
      .merge(dots)
      .transition().duration(300).ease(d3.easeCubicOut)
      .attr('cx', d => xScale(MONTH_NAMES[d.month]))
      .attr('cy', d => yScale(d.ridership));

    dots.exit().remove();
    updateAnalysis();
  }
}

function toggleSolution(card) {
  const isOpen = card.classList.contains('active');

  // close all cards first (storytelling behavior)
  document.querySelectorAll('.clickable-card').forEach(c => {
    c.classList.remove('active');
    c.querySelector('.card-hint').textContent = 'Click to expand';
  });

  // reopen clicked one if it wasn't already open
  if (!isOpen) {
    card.classList.add('active');
    card.querySelector('.card-hint').textContent = 'Click to collapse';
  }
}
// ═══════════════════════════════════════════
// SCROLLYTELLING
// ═══════════════════════════════════════════

function initScrollytelling() {

  const STEPS = {
    1: { agency: 'ALL',    year: 2008 },
    2: { agency: 'ALL',    year: 2018 },
    3: { agency: 'Subway', year: 2019 },
    4: { agency: 'Subway', year: 2020 },
    5: null,
  };

  let isUnlocked = false;

  function lockControls() {
    document.getElementById('chart-controls').classList.add('locked');
  }

  function unlockControls() {
    if (isUnlocked) return;
    isUnlocked = true;
    document.getElementById('chart-controls').classList.remove('locked');
    const toast = document.getElementById('unlock-toast');
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.6s';
      setTimeout(() => toast.style.display = 'none', 600);
    }, 4000);
  }

  function applyStep(stepNum) {
    const config = STEPS[stepNum];
    if (!config) { unlockControls(); return; }

    activeAgency = config.agency;
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.textContent === config.agency);
    });

    activeYear = config.year;
    slider.value = config.year;
    yearDisplay.textContent = config.year;

    updateSliderRange();
    updateGlobalMax();
    render();
  }

  lockControls();
  applyStep(1);

  const scroller = scrollama();
  scroller
    .setup({ step: '.scroll-step', offset: 0.55, debug: false })
    .onStepEnter(({ element }) => {
      const stepNum = +element.dataset.step;
      document.querySelectorAll('.step-card').forEach(c => c.classList.remove('is-active'));
      element.querySelector('.step-card').classList.add('is-active');
      applyStep(stepNum);
    });

  window.addEventListener('resize', scroller.resize);
}

// ═══════════════════════════════════════════
// SECTION 2 — CAPITAL PLAN SCROLLYTELLING
// ═══════════════════════════════════════════

function initCapitalScrollytelling() {

    // Categories to highlight for each step
    const CAPITAL_STEPS = {
      1: ['Passenger Stations', 'Subway Cars', 'Signals & Comms', 'Signal Modernization'],
      2: ['Passenger Stations', 'Subway Cars', 'Signals & Comms', 'Track', 'Buses'],
      3: ['Passenger Stations', 'Subway Cars', 'Signals & Comms'],
      4: ['Interborough Express'],
    };
  
    function highlightCategories(categories) {
      if (!window.capitalCatColorScale) return;
      capitalG.selectAll('.treemap-cell rect')
        .transition().duration(300)
        .attr('opacity', d => {
          if (!categories || categories.length === 0) return 0.85;
          return categories.includes(d.data.name) ? 1 : 0.2;
        });
    }
  
    function resetHighlight() {
      capitalG.selectAll('.treemap-cell rect')
        .transition().duration(300)
        .attr('opacity', 0.85);
    }
  
    const capitalScroller = scrollama();
    capitalScroller
      .setup({
        step: '.capital-scroll-step',
        offset: 0.55,
        debug: false,
      })
      .onStepEnter(({ element }) => {
        const stepNum = +element.dataset.capitalStep;
  
        document.querySelectorAll('.capital-scroll-step .step-card')
          .forEach(c => c.classList.remove('is-active'));
        element.querySelector('.step-card').classList.add('is-active');
  
        const cats = CAPITAL_STEPS[stepNum];
        if (cats) highlightCategories(cats);
      })
      .onStepExit(({ element, direction }) => {
        // reset on scroll back above step 1
        if (+element.dataset.capitalStep === 1 && direction === 'up') {
          resetHighlight();
        }
      });
  
    window.addEventListener('resize', capitalScroller.resize);
  }
const CAPITAL_COLORS = {
    'New York City Transit': '#c8963e',
    'MTA Bus Company':       '#4a9eca',
    'Long Island Rail Road': '#b07fd4',
    'Metro-North Railroad':  '#7bc67e',
    'MTA Construction & Development': '#e07b7b',
    'Bridges & Tunnels':     '#a0c4e8',
    'Staten Island Railway': '#d4a0c8',
    'MTA Police Department': '#e0a84a',
    'Other':                 '#888888',
  };
  
  // Short display names for buttons
  const CAPITAL_AGENCY_SHORT = {
    'New York City Transit':           'NYCT',
    'MTA Bus Company':                 'Bus',
    'Long Island Rail Road':           'LIRR',
    'Metro-North Railroad':            'MNR',
    'MTA Construction & Development':  'C&D',
    'Bridges & Tunnels':               'B&T',
    'Staten Island Railway':           'SIR',
    'MTA Police Department':           'Police',
  };
  
  let capitalData        = [];
  let capitalActiveAgency = 'ALL';
  let capitalSvg, capitalG;
  
  const capitalMargin = { top: 0, right: 0, bottom: 0, left: 0 };
  
  d3.csv("data/MTA_2025-2029_Capital_Plan_ACEP_Projects.csv").then(rawRows => {

    const CATEGORY_LABELS = {
      'SUBWAY CARS':        'Subway Cars',
      'BUSES':              'Buses',
      'PASSENGER STATIONS': 'Passenger Stations',
      'SIGNALS':            'Signal Modernization',
      'SIGNALS & COMMUNICATIONS': 'Signals & Comms',
      'TRACK':              'Track',
      'TRACK & STRUCTURES': 'Track & Structures',
      'POWER':              'Power & Substations',
      'TRACTION POWER':     'Traction Power',
      'SHOPS AND YARDS':    'Shops & Yards',
      'SHOPS & YARDS':      'Shops & Yards',
      'STRUCTURES':         'Structures & Tunnels',
      'LINE STRUCTURES':    'Line Structures',
      'COMMUNICATIONS':     'Communications',
      'COMM & SIGNALS':     'Comms & Signals',
      'TSMO':               'Traffic & Operations',
      'ACCESSIBILITY':      'Accessibility (ADA)',
      'RESILIENCY':         'Resiliency',
      'SUSTAINABILITY':     'Sustainability',
      'FARE COLLECTION':    'Fare Collection',
      'TECHNOLOGY':         'Technology',
      'SECURITY':           'Security',
      'AGENCY-WIDE':        'Agency-Wide',
      'ROLLING STOCK':      'Rolling Stock',
      'STATIONS':           'Stations',
      'INTERBOROUGH EXPRESS': 'Interborough Express',
      'BUILDINGS & SITES':  'Buildings & Sites',
      'UTILITIES':          'Utilities',
      'LINE EQUIPMENT':     'Line Equipment',
    };
  
    capitalData = rawRows.map(d => ({
      agency:   (d['Agency Name']          || '').trim() || 'Other',
      category: CATEGORY_LABELS[(d['Category Description'] || '').trim()] 
                || (d['Category Description'] || '').trim() 
                || 'Other',
      element:  (d['Element Description']  || '').trim(),
      project:  (d['Project Title']        || '').trim(),
      budget: +(d['Total Budget']) || 0,
    })).filter(d => d.budget > 0);
    console.log('budget check:', rawRows[1]['Total Budget'], typeof rawRows[1]['Total Budget']);

  
    setTimeout(() => {
        buildCapitalChart();
        renderCapitalAgencyButtons();
        renderCapitalLegend();
        renderTreemap();
        initCapitalScrollytelling(); // ← add this line
      }, 50);
  
  });
  // ── BUILD SVG CONTAINER ──
  
  function buildCapitalChart() {
    const wrap = document.getElementById('treemap-container');
    wrap.innerHTML = '';
  
    const W = wrap.clientWidth || 600;
    const H = 480;
  
    capitalSvg = d3.select('#treemap-container')
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H)
      .style('display', 'block');
  
    capitalG = capitalSvg.append('g');
  }
  
  // ── AGENCY FILTER BUTTONS ──
  
  function renderCapitalAgencyButtons() {
    const container = document.getElementById('capital-agency-btns');
    container.innerHTML = '';
  
    const agencies = ['ALL', ...new Set(capitalData.map(d => d.agency))].sort((a, b) => {
      if (a === 'ALL') return -1;
      if (b === 'ALL') return 1;
      return a.localeCompare(b);
    });
  
    agencies.forEach(agency => {
      const btn = document.createElement('button');
      btn.className = 'capital-agency-btn' + (agency === capitalActiveAgency ? ' active' : '');
      btn.textContent = agency === 'ALL' ? 'All Agencies' : (CAPITAL_AGENCY_SHORT[agency] || agency);
      btn.title = agency === 'ALL' ? 'All Agencies' : agency;
      btn.addEventListener('click', () => {
        capitalActiveAgency = agency;
        document.querySelectorAll('.capital-agency-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTreemap();
        updateCapitalTotal();
      });
      container.appendChild(btn);
    });
  }
  
  // ── COLOR LEGEND ──
  
  function renderCapitalLegend() {
    const container = document.getElementById('capital-legend');
    container.innerHTML = '';
  
    // Get unique categories across all data
    const categories = [...new Set(capitalData.map(d => d.category))].sort();
  
    // Assign colors by category index
    const catColorScale = d3.scaleOrdinal()
      .domain(categories)
      .range(d3.schemeTableau10.concat(d3.schemePastel1));
  
    // Store on window so treemap can use it
    window.capitalCatColorScale = catColorScale;
  
    categories.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'capital-legend-item';
  
      const dot = document.createElement('span');
      dot.className = 'capital-legend-dot';
      dot.style.background = catColorScale(cat);
  
      const label = document.createElement('span');
      label.className = 'capital-legend-label';
      label.textContent = cat;
  
      item.appendChild(dot);
      item.appendChild(label);
      container.appendChild(item);
    });
  }
  
  // ── UPDATE TOTAL STAT ──
  
  function updateCapitalTotal() {
    const filtered = capitalActiveAgency === 'ALL'
      ? capitalData
      : capitalData.filter(d => d.agency === capitalActiveAgency);
  
    const total = d3.sum(filtered, d => d.budget);
    const fmt = total >= 1000
  ? '$' + (total / 1000).toFixed(1) + 'B'
  : '$' + total.toFixed(0) + 'M';
  
    document.getElementById('capital-total').textContent = fmt;
  }
  
  // ── RENDER TREEMAP ──
  
  function renderTreemap() {
  
    if (!capitalSvg) return;
  
    const wrap = document.getElementById('treemap-container');
    const W = wrap.clientWidth || 600;
    const H = 480;
  
    capitalSvg.attr('viewBox', `0 0 ${W} ${H}`);
  
    const filtered = capitalActiveAgency === 'ALL'
      ? capitalData
      : capitalData.filter(d => d.agency === capitalActiveAgency);
  
    // Group by category, sum budget
    const byCategory = d3.rollup(
      filtered,
      v => ({
        total:    d3.sum(v, d => d.budget),
        agency:   capitalActiveAgency === 'ALL' ? 'All Agencies' : capitalActiveAgency,
        projects: v.length,
      }),
      d => d.category
    );
  
    const root = d3.hierarchy({ children: [...byCategory.entries()].map(([cat, val]) => ({
      name:     cat,
      value:    val.total,
      agency:   val.agency,
      projects: val.projects,
    }))})
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  
    d3.treemap()
      .size([W, H])
      .padding(3)
      .paddingTop(0)
      (root);
  
    const colorScale = window.capitalCatColorScale;
  
    // ── DRAW CELLS ──
    capitalG.selectAll('.treemap-cell').remove();
  
    const cells = capitalG.selectAll('.treemap-cell')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'treemap-cell')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
  
    cells.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill',   d => colorScale(d.data.name))
      .attr('opacity', 0.85)
      .attr('rx', 3)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5);
  
        const tt = document.getElementById('capital-tooltip');
        document.getElementById('capital-tt-category').textContent = d.data.name;
        document.getElementById('capital-tt-agency').textContent   = d.data.agency;
        document.getElementById('capital-tt-val').textContent =
        d.data.value >= 1000
          ? '$' + (d.data.value / 1000).toFixed(2) + 'B'
          : '$' + d.data.value.toFixed(0) + 'M';
  
        tt.style.opacity = '1';
        const rect = document.getElementById('treemap-container').getBoundingClientRect();
        tt.style.left = (event.clientX - rect.left + 14) + 'px';
        tt.style.top  = (event.clientY - rect.top  - 48) + 'px';
  
        // Update callout
        document.getElementById('capital-callout-name').textContent  = d.data.name;
        document.getElementById('capital-callout-total').textContent =
  d.data.value >= 1000
    ? '$' + (d.data.value / 1000).toFixed(2) + 'B allocated'
    : '$' + d.data.value.toFixed(0) + 'M allocated';
        document.getElementById('capital-callout-desc').textContent =
          d.data.projects + ' project' + (d.data.projects !== 1 ? 's' : '');
        document.getElementById('capital-callout').style.display = 'flex';
      })
      .on('mousemove', function(event) {
        const rect = document.getElementById('treemap-container').getBoundingClientRect();
        const tt   = document.getElementById('capital-tooltip');
        tt.style.left = (event.clientX - rect.left + 14) + 'px';
        tt.style.top  = (event.clientY - rect.top  - 48) + 'px';
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        document.getElementById('capital-tooltip').style.opacity = '0';
      });
  
    // ── LABELS (only on cells big enough) ──
    cells.each(function(d) {
      const cellW = d.x1 - d.x0;
      const cellH = d.y1 - d.y0;
      if (cellW < 60 || cellH < 30) return;
  
      const g = d3.select(this);
      const fmt = d.data.value >= 1000
      ? '$' + (d.data.value / 1000).toFixed(1) + 'B'
      : '$' + d.data.value.toFixed(0) + 'M';
  
      // Category name
      g.append('text')
        .attr('x', 8)
        .attr('y', 18)
        .attr('fill', '#fff')
        .attr('font-size', cellW > 120 ? '12px' : '10px')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-weight', '500')
        .style('pointer-events', 'none')
        .text(d.data.name)
        .each(function() {
          // truncate if too wide
          const maxW = cellW - 16;
          let text = d3.select(this);
          while (this.getComputedTextLength && this.getComputedTextLength() > maxW && text.text().length > 3) {
            text.text(text.text().slice(0, -4) + '…');
          }
        });
  
      // Dollar amount
      if (cellH > 50) {
        g.append('text')
          .attr('x', 8)
          .attr('y', 34)
          .attr('fill', 'rgba(255,255,255,0.65)')
          .attr('font-size', '11px')
          .attr('font-family', 'DM Sans, sans-serif')
          .style('pointer-events', 'none')
          .text(fmt);
      }
    });
  
    updateCapitalTotal();
  }
  
  // Resize treemap on window resize
  window.addEventListener('resize', () => {
    if (capitalData.length) {
      buildCapitalChart();
      renderTreemap();
    }
  });
  // // ═══════════════════════════════════════════
// SECTION 4 — FUNDING CUT SIMULATOR + MAP
// ═══════════════════════════════════════════

(function () {

    const SIM_ROUTES = [
      { id: 'A',  name: 'A',  color: '#0062CF', text: '#FFFFFF', headway: 13.1, stops: 66 },
      { id: 'C',  name: 'C',  color: '#0062CF', text: '#FFFFFF', headway: 9.1,  stops: 40 },
      { id: 'E',  name: 'E',  color: '#0062CF', text: '#FFFFFF', headway: 11.5, stops: 36 },
      { id: 'B',  name: 'B',  color: '#EB6800', text: '#FFFFFF', headway: 9.3,  stops: 37 },
      { id: 'D',  name: 'D',  color: '#EB6800', text: '#FFFFFF', headway: 10.5, stops: 41 },
      { id: 'F',  name: 'F',  color: '#EB6800', text: '#FFFFFF', headway: 9.2,  stops: 59 },
      { id: 'M',  name: 'M',  color: '#EB6800', text: '#FFFFFF', headway: 8.5,  stops: 36 },
      { id: 'G',  name: 'G',  color: '#6CBE45', text: '#FFFFFF', headway: 9.6,  stops: 21 },
      { id: 'J',  name: 'J',  color: '#996633', text: '#FFFFFF', headway: 10.3, stops: 30 },
      { id: 'Z',  name: 'Z',  color: '#996633', text: '#FFFFFF', headway: 10.1, stops: 21 },
      { id: 'L',  name: 'L',  color: '#A7A9AC', text: '#FFFFFF', headway: 5.3,  stops: 24 },
      { id: 'N',  name: 'N',  color: '#FCCC0A', text: '#000000', headway: 14.8, stops: 50 },
      { id: 'Q',  name: 'Q',  color: '#FCCC0A', text: '#000000', headway: 10.4, stops: 34 },
      { id: 'R',  name: 'R',  color: '#FCCC0A', text: '#000000', headway: 8.6,  stops: 52 },
      { id: 'W',  name: 'W',  color: '#FCCC0A', text: '#000000', headway: 17.1, stops: 47 },
      { id: '1',  name: '1',  color: '#EE352E', text: '#FFFFFF', headway: 6.3,  stops: 38 },
      { id: '2',  name: '2',  color: '#EE352E', text: '#FFFFFF', headway: 12.7, stops: 71 },
      { id: '3',  name: '3',  color: '#EE352E', text: '#FFFFFF', headway: 8.3,  stops: 34 },
      { id: '4',  name: '4',  color: '#00933C', text: '#FFFFFF', headway: 12.5, stops: 54 },
      { id: '5',  name: '5',  color: '#00933C', text: '#FFFFFF', headway: 14.6, stops: 55 },
      { id: '6',  name: '6',  color: '#00933C', text: '#FFFFFF', headway: 7.0,  stops: 38 },
      { id: '7',  name: '7',  color: '#B933AD', text: '#FFFFFF', headway: 5.4,  stops: 22 },
      { id: 'GS', name: 'S',  color: '#808183', text: '#FFFFFF', headway: 4.3,  stops: 2  },
    ];
  
    const MAP_LINES = [
      { ids: ['1','2','3'], points: [[120,30],[120,120],[100,160],[100,580]] },
      { ids: ['4','5','6'], points: [[260,30],[260,200],[280,240],[280,580]] },
      { ids: ['7'],         points: [[60,200],[400,200]] },
      { ids: ['A','C','E'], points: [[80,30],[80,150],[60,200],[60,580]] },
      { ids: ['B','D','F','M'], points: [[160,30],[160,300],[180,340],[180,580]] },
      { ids: ['N','Q','R','W'], points: [[220,30],[220,180],[300,300],[320,580]] },
      { ids: ['L'],         points: [[60,340],[420,340]] },
      { ids: ['G'],         points: [[340,200],[340,480]] },
      { ids: ['J','Z'],     points: [[280,340],[400,440],[460,560]] },
      { ids: ['GS'],        points: [[160,200],[260,200]] },
    ];
  
    // Scrollytelling highlight config
    const COMMUTE_STEPS = {
      1: { highlight: ['L'],                    cutDemo: [],                    domino: false },
      2: { highlight: ['J','Z','G','7'],         cutDemo: [],                    domino: false },
      3: { highlight: ['4','5','6','A','C','E'], cutDemo: [],                    domino: false },
      4: { highlight: null,                      cutDemo: ['L','J','Z','G'],     domino: true  },
      5: { highlight: null,                      cutDemo: [],                    domino: false, unlock: true },
    };
  
    const DAILY_RIDERS = 3500000;
    const HOURLY_WAGE  = 38.65;
    const ROUTES = [...new Map(SIM_ROUTES.map(r => [r.id, r])).values()];
    const TOTAL_STOPS = ROUTES.reduce((s, r) => s + r.stops, 0);
    const cut = new Set();
    let isUnlocked = false;
    let dominoInterval = null;
  
    // ── BUILD MAP ──
    const mapSvg = document.getElementById('subway-map');
    if (!mapSvg) return;
  
    const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
    bg.setAttribute('width','500'); bg.setAttribute('height','600');
    bg.setAttribute('fill','#0d1b2a'); bg.setAttribute('rx','8');
    mapSvg.appendChild(bg);
  
    // Borough outlines
    const boroughs = [
      { name: 'Manhattan',    d: 'M 180,40 L 200,35 L 215,50 L 220,100 L 225,150 L 230,200 L 225,260 L 215,300 L 200,320 L 185,310 L 175,280 L 170,240 L 165,200 L 160,150 L 158,100 L 162,60 Z' },
      { name: 'Brooklyn',     d: 'M 160,380 L 200,360 L 260,355 L 310,370 L 330,400 L 340,440 L 320,480 L 280,510 L 240,520 L 200,510 L 170,490 L 155,460 L 148,430 L 150,400 Z' },
      { name: 'Queens',       d: 'M 260,200 L 320,180 L 400,185 L 450,210 L 460,260 L 450,320 L 420,370 L 370,390 L 320,385 L 280,370 L 265,340 L 255,300 L 250,260 L 252,230 Z' },
      { name: 'Bronx',        d: 'M 220,40 L 280,30 L 350,40 L 400,70 L 420,110 L 410,150 L 380,170 L 340,175 L 300,170 L 265,155 L 245,130 L 230,100 L 222,70 Z' },
      { name: 'Staten Island',d: 'M 40,420 L 80,400 L 110,410 L 120,440 L 115,470 L 95,490 L 65,495 L 42,480 L 35,455 Z' },
    ];
  
    const labelPositions = {
      'Manhattan':    [192, 190],
      'Brooklyn':     [235, 440],
      'Queens':       [360, 285],
      'Bronx':        [315, 110],
      'Staten Island':[75,  450],
    };
  
    const boroughGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
    boroughGroup.setAttribute('opacity','0.12');
    boroughs.forEach(b => {
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', b.d);
      path.setAttribute('fill', 'rgba(255,255,255,0.15)');
      path.setAttribute('stroke', 'rgba(255,255,255,0.4)');
      path.setAttribute('stroke-width', '1.5');
      boroughGroup.appendChild(path);
      const pos = labelPositions[b.name];
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', pos[0]); txt.setAttribute('y', pos[1]);
      txt.setAttribute('fill','rgba(255,255,255,0.5)');
      txt.setAttribute('font-size','9');
      txt.setAttribute('font-family','DM Sans, sans-serif');
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('pointer-events','none');
      txt.textContent = b.name.toUpperCase();
      boroughGroup.appendChild(txt);
    });
    mapSvg.appendChild(boroughGroup);
  
    // Map label
    const mapLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    mapLabel.setAttribute('x','16'); mapLabel.setAttribute('y','24');
    mapLabel.setAttribute('fill','rgba(255,255,255,0.3)');
    mapLabel.setAttribute('font-size','11');
    mapLabel.setAttribute('font-family','DM Sans, sans-serif');
    mapLabel.textContent = 'NYC Subway — Schematic';
    mapSvg.appendChild(mapLabel);
  
    // Draw lines
    const polylineMap = {}; // id → polyline elements
  
    MAP_LINES.forEach(line => {
      const firstRoute = ROUTES.find(r => line.ids.includes(r.id));
      if (!firstRoute) return;
  
      const pts = line.points.map(p => p.join(',')).join(' ');
      const polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
      polyline.setAttribute('points', pts);
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', firstRoute.color);
      polyline.setAttribute('stroke-width', '5');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      polyline.setAttribute('opacity', '1');
      polyline.style.cursor = 'pointer';
      polyline.style.transition = 'opacity 0.4s, stroke-width 0.3s';
      polyline.dataset.lineIds = line.ids.join(',');
  
      polyline.addEventListener('click', () => {
        if (!isUnlocked) return;
        const ids = line.ids;
        const allCut = ids.every(id => cut.has(id));
        ids.forEach(id => {
          if (allCut) {
            cut.delete(id);
            const btn = document.getElementById('sim-btn-' + id);
            if (btn) btn.classList.remove('cut');
          } else {
            cut.add(id);
            const btn = document.getElementById('sim-btn-' + id);
            if (btn) btn.classList.add('cut');
          }
        });
        updateMapVisual();
        simUpdate();
      });
  
      // Route label at midpoint
      const mid = line.points[Math.floor(line.points.length / 2)];
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', mid[0] + 6); txt.setAttribute('y', mid[1] - 6);
      txt.setAttribute('fill', firstRoute.color);
      txt.setAttribute('font-size', '10');
      txt.setAttribute('font-family', 'DM Sans, sans-serif');
      txt.setAttribute('font-weight', '600');
      txt.setAttribute('pointer-events', 'none');
      txt.textContent = line.ids.join('/');
      mapSvg.appendChild(txt);
      mapSvg.insertBefore(polyline, txt);
  
      // Store reference for each id
      line.ids.forEach(id => { polylineMap[id] = polyline; });
    });
  
    // ── MAP VISUAL HELPERS ──
  
    function updateMapVisual() {
      mapSvg.querySelectorAll('polyline').forEach(polyline => {
        const ids = polyline.dataset.lineIds.split(',');
        const allCut = ids.every(id => cut.has(id));
        polyline.setAttribute('opacity', allCut ? '0.15' : '1');
        polyline.setAttribute('stroke-width', allCut ? '3' : '5');
      });
    }
  
    function highlightLines(ids) {
      // null = reset all to full
      mapSvg.querySelectorAll('polyline').forEach(polyline => {
        const lineIds = polyline.dataset.lineIds.split(',');
        if (!ids) {
          polyline.setAttribute('opacity', '1');
          polyline.setAttribute('stroke-width', '5');
        } else {
          const isHighlighted = lineIds.some(id => ids.includes(id));
          polyline.setAttribute('opacity', isHighlighted ? '1' : '0.15');
          polyline.setAttribute('stroke-width', isHighlighted ? '7' : '3');
        }
      });
    }
  
    function demoCuts(ids) {
      ids.forEach(id => {
        const btn = document.getElementById('sim-btn-' + id);
        if (btn) btn.classList.add('cut');
      });
      mapSvg.querySelectorAll('polyline').forEach(polyline => {
        const lineIds = polyline.dataset.lineIds.split(',');
        const isCut = lineIds.some(id => ids.includes(id));
        polyline.setAttribute('opacity', isCut ? '0.15' : '1');
        polyline.setAttribute('stroke-width', isCut ? '3' : '5');
      });
    }
  
    function resetDemoCuts(ids) {
      ids.forEach(id => {
        const btn = document.getElementById('sim-btn-' + id);
        if (btn) btn.classList.remove('cut');
      });
      highlightLines(null);
    }
  
    function startDomino() {
      if (dominoInterval) clearInterval(dominoInterval);
      const allPolylines = Array.from(mapSvg.querySelectorAll('polyline'));
      let i = 0;
      // Flash red one by one
      dominoInterval = setInterval(() => {
        if (i > 0) {
          allPolylines[i-1].setAttribute('stroke', allPolylines[i-1]._origColor || '#fff');
          allPolylines[i-1].setAttribute('opacity','1');
        }
        if (i >= allPolylines.length) {
          clearInterval(dominoInterval);
          // restore all
          allPolylines.forEach(p => {
            p.setAttribute('stroke', p._origColor || '#fff');
            p.setAttribute('opacity','1');
            p.setAttribute('stroke-width','5');
          });
          return;
        }
        // Save original color
        if (!allPolylines[i]._origColor) {
          allPolylines[i]._origColor = allPolylines[i].getAttribute('stroke');
        }
        allPolylines[i].setAttribute('stroke','#e07b7b');
        allPolylines[i].setAttribute('opacity','0.9');
        allPolylines[i].setAttribute('stroke-width','7');
        i++;
      }, 200);
    }
  
    function stopDomino() {
      if (dominoInterval) clearInterval(dominoInterval);
      mapSvg.querySelectorAll('polyline').forEach(p => {
        if (p._origColor) p.setAttribute('stroke', p._origColor);
        p.setAttribute('opacity','1');
        p.setAttribute('stroke-width','5');
      });
    }
  
    // ── UNLOCK ──
  
    function unlockMap() {
      if (isUnlocked) return;
      isUnlocked = true;
      highlightLines(null);
      document.getElementById('sim-stats-panel').style.display = 'block';
      const toast = document.getElementById('commute-unlock-toast');
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.6s';
        setTimeout(() => toast.style.display = 'none', 600);
      }, 4000);
      // make map lines clickable visually
      mapSvg.querySelectorAll('polyline').forEach(p => {
        p.style.cursor = 'pointer';
      });
    }
  
    // ── SCROLLYTELLING ──
  
    const commuteScroller = scrollama();
    commuteScroller
      .setup({ step: '.commute-scroll-step', offset: 0.55, debug: false })
      .onStepEnter(({ element }) => {
        const stepNum = +element.dataset.commuteStep;
  
        document.querySelectorAll('.commute-scroll-step .step-card')
          .forEach(c => c.classList.remove('is-active'));
        element.querySelector('.step-card').classList.add('is-active');
  
        const config = COMMUTE_STEPS[stepNum];
        if (!config) return;
  
        stopDomino();
  
        if (config.unlock) {
          unlockMap();
          return;
        }
  
        if (config.domino) {
          highlightLines(null);
          startDomino();
          return;
        }
  
        if (config.cutDemo && config.cutDemo.length) {
          demoCuts(config.cutDemo);
        } else {
          resetDemoCuts(['L','J','Z','G','4','5','6','A','C','E']);
          if (config.highlight) highlightLines(config.highlight);
          else highlightLines(null);
        }
      })
      .onStepExit(({ element, direction }) => {
        if (+element.dataset.commuteStep === 4 && direction === 'down') {
          stopDomino();
        }
      });
  
    window.addEventListener('resize', commuteScroller.resize);
  
    // ── BUILD BUTTONS ──
    const container = document.getElementById('sim-route-buttons');
    if (!container) return;
  
    ROUTES.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'sim-route-btn';
      btn.id = 'sim-btn-' + r.id;
      btn.textContent = r.name;
      btn.style.background = r.color;
      btn.style.color = r.text;
      btn.title = r.name + ' — headway ' + r.headway + ' min, ' + r.stops + ' stops';
      btn.addEventListener('click', () => {
        if (!isUnlocked) return;
        if (cut.has(r.id)) {
          cut.delete(r.id);
          btn.classList.remove('cut');
        } else {
          cut.add(r.id);
          btn.classList.add('cut');
        }
        updateMapVisual();
        simUpdate();
      });
      container.appendChild(btn);
    });
  
    // ── STATS ──
    function fmtN(n) { return Math.round(n).toLocaleString(); }
    function fmtM(n) {
      return n >= 1e9
        ? '$' + (n / 1e9).toFixed(2) + 'B'
        : '$' + (n / 1e6).toFixed(0) + 'M';
    }
  
    function getEquiv(lostHours) {
      const teachers = Math.round(lostHours / 1800);
      if (teachers >= 100) {
        return {
          val: fmtN(teachers) + ' teacher-years',
          ctx: 'The collective time lost equals ' + fmtN(teachers) + ' full teacher work-years every year.'
        };
      }
      const marathons = Math.round(lostHours / 4.5);
      return {
        val: fmtN(marathons) + ' marathons worth of time',
        ctx: 'Riders lose the equivalent of ' + fmtN(marathons) + ' marathon finishing times in extra waiting every year.'
      };
    }
  
    function simUpdate() {
      const cutRoutes = ROUTES.filter(r => cut.has(r.id));
      const nCut = cutRoutes.length;
      document.getElementById('sim-cut').textContent = nCut;
  
      if (nCut === 0) {
        document.getElementById('sim-stops').textContent  = '0';
        document.getElementById('sim-wait').textContent   = '+0.0 min';
        document.getElementById('sim-riders').textContent = '0';
        document.getElementById('sim-roi').style.display     = 'none';
        document.getElementById('sim-no-cuts').style.display = 'block';
        return;
      }
  
      document.getElementById('sim-no-cuts').style.display = 'none';
      document.getElementById('sim-roi').style.display     = 'block';
  
      const affectedStops  = cutRoutes.reduce((s, r) => s + r.stops, 0);
      const avgHeadway     = cutRoutes.reduce((s, r) => s + r.headway, 0) / nCut;
      const waitIncrease   = avgHeadway / 2;
      const affectedRiders = Math.round(DAILY_RIDERS * (affectedStops / TOTAL_STOPS) * 0.6);
  
      document.getElementById('sim-stops').textContent  = fmtN(affectedStops);
      document.getElementById('sim-wait').textContent   = '+' + waitIncrease.toFixed(1) + ' min';
      document.getElementById('sim-riders').textContent = fmtN(affectedRiders);
  
      const lostHoursYear = (affectedRiders * waitIncrease * 2 / 60) * 365;
      const econCost      = lostHoursYear * HOURLY_WAGE;
      const eq            = getEquiv(lostHoursYear);
  
      document.getElementById('sim-hours').textContent   = fmtN(lostHoursYear) + ' hrs';
      document.getElementById('sim-econ').textContent    = fmtM(econCost) + '/yr';
      document.getElementById('sim-equiv').textContent   = eq.val;
      document.getElementById('sim-context').textContent = eq.ctx;
  
      document.getElementById('sim-hours-back').textContent  = fmtN(lostHoursYear) + ' hrs';
      document.getElementById('sim-econ-back').textContent   = fmtM(econCost) + '/yr';
      document.getElementById('sim-riders-back').textContent = fmtN(affectedRiders) + ' riders';
    }
  
    simUpdate();
  
  })();
  
function flipCard(card) {
  card.classList.toggle("flipped");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".flip-card").forEach(card => {
    card.addEventListener("click", () => flipCard(card));
  });
});