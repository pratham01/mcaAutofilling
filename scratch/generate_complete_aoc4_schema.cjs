const fs = require('fs');
const path = require('path');

const completeMapping = {
  companyInfo: {
    cin: process.env.CIN || '',
    gln: '',
    companyName: process.env.COMPANY_NAME || '',
    registeredAddress: '',
    email: '',
    phone: '',
    numberOfMembers: '2',
    financialYearFrom: '01/04/2025',
    financialYearTo: '31/03/2026',
    boardMeetingDate: '05/09/2026',
    boardMeetingReportDate: '05/09/2026',
    auditorReportDate: '04/09/2026',
    natureOfFinancialStatements: 'Adopted by AGM',
    adoptionStatus: 'Adopted',
    agmHeld: 'Yes',
    actualAgmDate: '20/09/2026',
    dueAgmDate: '30/09/2026',
    agmExtension: 'No',
    subsidiaryCount: '0',
    auditor: {
      count: '1',
      category: 'Firm',
      pan: 'AABFS4512K',
      name: 'Sarda Mantri and Company',
      frn: '138258W',
      auditorName: 'CA Sandip D. Sarda',
      membershipNo: '151073'
    },
    director1: {
      din: '09179171',
      name: 'GURPREET SINGH SALUJA',
      designation: 'Director'
    },
    director2: {
      din: '09179172',
      name: 'RANJEET KAUR',
      designation: 'Director'
    }
  },

  partB_balanceSheet: [
    // 1. Shareholders' Funds
    {
      id: 'bs_share_capital',
      schedule: '1.(a)',
      category: "Shareholders' Funds",
      label: '1. (a) Share Capital',
      currentReportingPeriod: '100000',
      previousReportingPeriod: '100000',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget'
    },
    {
      id: 'bs_reserves_surplus',
      schedule: '1.(b)',
      category: "Shareholders' Funds",
      label: '1. (b) Reserves and Surplus (Profit & Loss A/c)',
      currentReportingPeriod: '-467954',
      previousReportingPeriod: '-746390',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517445___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517446___widget'
    },
    {
      id: 'bs_money_share_warrants',
      schedule: '1.(c)',
      category: "Shareholders' Funds",
      label: '1. (c) Money received against share warrants',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643810520000"]',
      previousSelector: '[id*="tableItem1643810520001"]'
    },
    {
      id: 'bs_share_app_money',
      schedule: '2.',
      category: 'Share Application Money',
      label: '2. Share application money pending allotment',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643810525000"]',
      previousSelector: '[id*="tableItem1643810525001"]'
    },

    // 2. Non-Current Liabilities
    {
      id: 'bs_long_term_borrowings',
      schedule: '3.(a)',
      category: 'Non-Current Liabilities',
      label: '3. (a) Long-Term Borrowings',
      currentReportingPeriod: '-293431',
      previousReportingPeriod: '1406684',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210419___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210420___widget'
    },
    {
      id: 'bs_deferred_tax_liabilities',
      schedule: '3.(b)',
      category: 'Non-Current Liabilities',
      label: '3. (b) Deferred Tax Liabilities (Net)',
      currentReportingPeriod: '0',
      previousReportingPeriod: '5558',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811214000-tableItem1643811214003___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811214000-tableItem1643811214004___widget'
    },
    {
      id: 'bs_other_long_term_liabilities',
      schedule: '3.(c)',
      category: 'Non-Current Liabilities',
      label: '3. (c) Other Long-Term Liabilities',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643811220000"]',
      previousSelector: '[id*="tableItem1643811220001"]'
    },
    {
      id: 'bs_long_term_provisions',
      schedule: '3.(d)',
      category: 'Non-Current Liabilities',
      label: '3. (d) Long-Term Provisions',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643811225000"]',
      previousSelector: '[id*="tableItem1643811225001"]'
    },

    // 3. Current Liabilities
    {
      id: 'bs_short_term_borrowings',
      schedule: '4.(a)',
      category: 'Current Liabilities',
      label: '4. (a) Short-Term Borrowings',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643867860000"]',
      previousSelector: '[id*="tableItem1643867860001"]'
    },
    {
      id: 'bs_trade_payables_msme',
      schedule: '4.(b)(i)',
      category: 'Current Liabilities',
      label: '4. (b)(i) Trade Payables - MSME Enterprises',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1720503310000"]',
      previousSelector: '[id*="tableItem1720503310001"]'
    },
    {
      id: 'bs_trade_payables',
      schedule: '4.(b)(ii)',
      category: 'Current Liabilities',
      label: '4. (b)(ii) Trade Payables - Others',
      currentReportingPeriod: '2248',
      previousReportingPeriod: '337',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1720503320433-tableItem1720503320436___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1720503320433-tableItem1720503320437___widget'
    },
    {
      id: 'bs_other_current_liabilities',
      schedule: '4.(c)',
      category: 'Current Liabilities',
      label: '4. (c) Other Current Liabilities',
      currentReportingPeriod: '1700000',
      previousReportingPeriod: '0',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867870853-tableItem1643867870856___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867870853-tableItem1643867870857___widget'
    },
    {
      id: 'bs_short_term_provisions',
      schedule: '4.(d)',
      category: 'Current Liabilities',
      label: '4. (d) Short-Term Provisions',
      currentReportingPeriod: '429462',
      previousReportingPeriod: '346137',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867878141-tableItem1643867878144___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867878141-tableItem1643867878145___widget'
    },

    // 4. Non-Current Assets
    {
      id: 'bs_tangible_assets',
      schedule: '1.(a)(i)',
      category: 'Non-Current Assets',
      label: '1. (a)(i) Property, Plant & Equipment (Tangible Assets)',
      currentReportingPeriod: '210066',
      previousReportingPeriod: '185756',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869054335-tableItem1643869054338___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869054335-tableItem1643869054339___widget'
    },
    {
      id: 'bs_intangible_assets',
      schedule: '1.(a)(ii)',
      category: 'Non-Current Assets',
      label: '1. (a)(ii) Intangible Assets',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869060000"]',
      previousSelector: '[id*="tableItem1643869060001"]'
    },
    {
      id: 'bs_capital_wip',
      schedule: '1.(a)(iii)',
      category: 'Non-Current Assets',
      label: '1. (a)(iii) Capital Work-in-Progress (CWIP)',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869065000"]',
      previousSelector: '[id*="tableItem1643869065001"]'
    },
    {
      id: 'bs_intangible_assets_dev',
      schedule: '1.(a)(iv)',
      category: 'Non-Current Assets',
      label: '1. (a)(iv) Intangible Assets under Development',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869070000"]',
      previousSelector: '[id*="tableItem1643869070001"]'
    },
    {
      id: 'bs_non_current_investments',
      schedule: '1.(b)',
      category: 'Non-Current Assets',
      label: '1. (b) Non-Current Investments',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869080000"]',
      previousSelector: '[id*="tableItem1643869080001"]'
    },
    {
      id: 'bs_deferred_tax_assets',
      schedule: '1.(c)',
      category: 'Non-Current Assets',
      label: '1. (c) Deferred Tax Assets (Net)',
      currentReportingPeriod: '224',
      previousReportingPeriod: '0',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869089142-tableItem1643869089145___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869089142-tableItem1643869089146___widget'
    },
    {
      id: 'bs_long_term_loans',
      schedule: '1.(d)',
      category: 'Non-Current Assets',
      label: '1. (d) Long-Term Loans and Advances',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869095000"]',
      previousSelector: '[id*="tableItem1643869095001"]'
    },
    {
      id: 'bs_other_non_current_assets',
      schedule: '1.(e)',
      category: 'Non-Current Assets',
      label: '1. (e) Other Non-Current Assets',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869100000"]',
      previousSelector: '[id*="tableItem1643869100001"]'
    },

    // 5. Current Assets
    {
      id: 'bs_current_investments',
      schedule: '2.(a)',
      category: 'Current Assets',
      label: '2. (a) Current Investments',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869670000"]',
      previousSelector: '[id*="tableItem1643869670001"]'
    },
    {
      id: 'bs_inventories',
      schedule: '2.(b)',
      category: 'Current Assets',
      label: '2. (b) Inventories',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869680000"]',
      previousSelector: '[id*="tableItem1643869680001"]'
    },
    {
      id: 'bs_trade_receivables',
      schedule: '2.(c)',
      category: 'Current Assets',
      label: '2. (c) Trade Receivables',
      currentReportingPeriod: '1118429',
      previousReportingPeriod: '911428',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869691133-tableItem1643869691136___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869691133-tableItem1643869691137___widget'
    },
    {
      id: 'bs_cash_and_equivalents',
      schedule: '2.(d)',
      category: 'Current Assets',
      label: '2. (d) Cash and Cash Equivalents',
      currentReportingPeriod: '76657',
      previousReportingPeriod: '5244',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869700097-tableItem1643869700100___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869700097-tableItem1643869700101___widget'
    },
    {
      id: 'bs_short_term_loans',
      schedule: '2.(e)',
      category: 'Current Assets',
      label: '2. (e) Short-Term Loans and Advances',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643869710000"]',
      previousSelector: '[id*="tableItem1643869710001"]'
    },
    {
      id: 'bs_other_current_assets',
      schedule: '2.(f)',
      category: 'Current Assets',
      label: '2. (f) Other Current Assets',
      currentReportingPeriod: '64949',
      previousReportingPeriod: '9898',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869716976-tableItem1643869716979___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869716976-tableItem1643869716980___widget'
    }
  ],

  partC_profitAndLoss: [
    {
      id: 'pl_revenue_operations',
      schedule: 'I.',
      category: 'Income',
      label: 'I. Revenue from Operations',
      currentReportingPeriod: '6972252',
      previousReportingPeriod: '5652494',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541251___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541252___widget'
    },
    {
      id: 'pl_other_income',
      schedule: 'II.',
      category: 'Income',
      label: 'II. Other Income',
      currentReportingPeriod: '400',
      previousReportingPeriod: '5044',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644086710222-tableItem1644086710222___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644086710222-tableItem1644086710223___widget'
    },
    {
      id: 'pl_cost_materials',
      schedule: 'IV.(a)',
      category: 'Expenses',
      label: 'IV. (a) Cost of Materials Consumed',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644088960000"]',
      previousSelector: '[id*="tableItem1644088960001"]'
    },
    {
      id: 'pl_purchases_stock',
      schedule: 'IV.(b)',
      category: 'Expenses',
      label: 'IV. (b) Purchases of Stock-in-Trade',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644088970000"]',
      previousSelector: '[id*="tableItem1644088970001"]'
    },
    {
      id: 'pl_changes_inventories',
      schedule: 'IV.(c)',
      category: 'Expenses',
      label: 'IV. (c) Changes in Inventories of Finished Goods, WIP & Stock',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644088980000"]',
      previousSelector: '[id*="tableItem1644088980001"]'
    },
    {
      id: 'pl_employee_expenses',
      schedule: 'IV.(d)',
      category: 'Expenses',
      label: 'IV. (d) Employee Benefit Expenses',
      currentReportingPeriod: '5191501',
      previousReportingPeriod: '3919184',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644088984591-tableItem1644088984594___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644088984591-tableItem1644088984595___widget'
    },
    {
      id: 'pl_finance_costs',
      schedule: 'IV.(e)',
      category: 'Expenses',
      label: 'IV. (e) Finance Costs',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644089010000"]',
      previousSelector: '[id*="tableItem1644089010001"]'
    },
    {
      id: 'pl_depreciation',
      schedule: 'IV.(f)',
      category: 'Expenses',
      label: 'IV. (f) Depreciation & Amortization Expense',
      currentReportingPeriod: '79012',
      previousReportingPeriod: '64699',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644089025195-tableItem1644089025199___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644089025195-tableItem1644089025200___widget'
    },
    {
      id: 'pl_other_expenses',
      schedule: 'IV.(g)',
      category: 'Expenses',
      label: 'IV. (g) Other Expenses / Administrative & General Expenses',
      currentReportingPeriod: '1429485',
      previousReportingPeriod: '1015084',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644089032938-tableItem1644089032941___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644089032938-tableItem1644089032942___widget'
    },
    {
      id: 'pl_exceptional_items',
      schedule: 'VII.',
      category: 'Exceptional / Tax',
      label: 'VII. Exceptional Items',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644089050000"]',
      previousSelector: '[id*="tableItem1644089050001"]'
    },
    {
      id: 'pl_extraordinary_items',
      schedule: 'IX.',
      category: 'Exceptional / Tax',
      label: 'IX. Extraordinary Items',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1644089060000"]',
      previousSelector: '[id*="tableItem1644089060001"]'
    },
    {
      id: 'pl_current_tax',
      schedule: 'XI.(a)',
      category: 'Exceptional / Tax',
      label: 'XI. (a) Current Tax Expense',
      currentReportingPeriod: '0',
      previousReportingPeriod: '0',
      currentSelector: '[id*="tableItem1643870660147"]',
      previousSelector: '[id*="tableItem1643870660148"]'
    },
    {
      id: 'pl_deferred_tax',
      schedule: 'XI.(b)',
      category: 'Exceptional / Tax',
      label: 'XI. (b) Deferred Tax Expense / (Credit)',
      currentReportingPeriod: '-58',
      previousReportingPeriod: '-14',
      currentSelector: '[id*="tableItem1643870661147"]',
      previousSelector: '[id*="tableItem1643870661148"]'
    },
    {
      id: 'pl_profit_after_tax',
      schedule: 'XVI.',
      category: 'Profit / (Loss)',
      label: 'XVI. Profit / (Loss) for the Year',
      currentReportingPeriod: '278436',
      previousReportingPeriod: '659993',
      currentSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870663481-tableItem1643870663484___widget',
      previousSelector: '#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870663481-tableItem1643870663485___widget'
    },
    {
      id: 'pl_eps_basic',
      schedule: 'XVII.(a)',
      category: 'Earnings Per Share',
      label: 'XVII. (a) Earnings per Equity Share: Basic (Rs.)',
      currentReportingPeriod: '27.84',
      previousReportingPeriod: '66.00',
      currentSelector: '[id*="tableItem1643870670000"]',
      previousSelector: '[id*="tableItem1643870670001"]'
    },
    {
      id: 'pl_eps_diluted',
      schedule: 'XVII.(b)',
      category: 'Earnings Per Share',
      label: 'XVII. (b) Earnings per Equity Share: Diluted (Rs.)',
      currentReportingPeriod: '27.84',
      previousReportingPeriod: '66.00',
      currentSelector: '[id*="tableItem1643870675000"]',
      previousSelector: '[id*="tableItem1643870675001"]'
    }
  ]
};

fs.writeFileSync('data/aoc4_mapping_state.json', JSON.stringify(completeMapping, null, 2), 'utf-8');
fs.writeFileSync('extension/aoc4_mapping_state.json', JSON.stringify(completeMapping, null, 2), 'utf-8');

const standardTemplate = {
  id: 'aoc4_standard_pvt_ltd',
  name: 'MCA AOC-4 Private Limited (Schedule III - Indian GAAP)',
  formType: 'AOC-4',
  applicableTo: 'Private Limited Companies (Non-IndAS)',
  accountingStandard: 'Indian GAAP / AS (Schedule III)',
  version: '2025-26.2',
  description: 'Comprehensive Schedule III two-column audited Balance Sheet and P&L mapping covering all statutory Balance Sheet lines and P&L lines under Companies Act 2013.',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mappingState: completeMapping
};

fs.writeFileSync('data/templates/aoc4_standard_pvt_ltd.json', JSON.stringify(standardTemplate, null, 2), 'utf-8');
console.log('Successfully wrote full statutory schema to data/aoc4_mapping_state.json and templates!');
