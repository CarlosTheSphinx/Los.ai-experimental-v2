# Loan Pricing White-Label Tool - Complete Code

Last Updated: January 30, 2026

This document contains all the source code files for the Loan Pricing White-Label Tool with Sphinx Capital branding.

---

## File: package.json

```json
{
  "name": "loan-pricer-white-label",
  "version": "1.0.0",
  "description": "White-labeled loan pricing interface with Puppeteer automation",
  "main": "server.js",
  "scripts": {
    "start": "node server-apify.js",
    "start:playwright": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["puppeteer", "automation", "loan-pricing"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "apify-client": "^2.7.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## File: README.md

```markdown
# Loan Pricing White-Label Tool

A scalable white-label solution that allows your reps to input loan information through a clean interface, which then uses Puppeteer to automatically fill out forms on the provider's website and return interest rates.

## Features

- 🎨 Clean, modern web interface for loan input
- 🤖 Automated form filling using Puppeteer
- 🔒 White-labeled - reps never see the provider's website
- ⚡ Scalable architecture with browser instance reuse
- 🛡️ Error handling and validation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env if you want to change the port
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the interface:**
   Open your browser to `http://localhost:3000`

## How It Works

1. Reps fill out the loan information form on your white-labeled interface
2. The form data is sent to your backend API (`/api/get-pricing`)
3. Puppeteer opens the provider's website in a headless browser
4. The form fields are automatically filled based on the input data
5. The interest rate is extracted from the results page
6. The rate is returned to your reps through your interface

## Customization

### Adjusting Form Field Mappings

The form field mappings in `server.js` may need to be adjusted based on the actual structure of the provider's website. To customize:

1. Check the browser console logs when running the server - it will show available form fields
2. Update the `fieldMappings` object in `server.js` to match the actual field names/IDs
3. Adjust the `fillField` function if the form uses different input methods

### Extracting Interest Rate

The interest rate extraction logic may need adjustment based on how the provider displays rates. The current implementation:

- Searches for elements containing "rate", "interest", or "apr"
- Looks for percentage values in the page text
- Filters for reasonable rates (0-30%)

You can customize the extraction logic in the `page.evaluate()` section of the `/api/get-pricing` endpoint.

## API Endpoints

- `POST /api/get-pricing` - Submit loan data and get interest rate
- `GET /api/health` - Health check endpoint
- `GET /` - Serve the frontend interface

## Request Format

```json
{
  "loanAmount": "300000",
  "loanTerm": "30",
  "propertyValue": "400000",
  "creditScore": "750",
  "propertyType": "Single Family",
  "occupancy": "Primary Residence",
  "loanType": "Conventional"
}
```

## Response Format

**Success:**
```json
{
  "success": true,
  "interestRate": 6.5,
  "loanData": { ... }
}
```

**Error:**
```json
{
  "error": "Error message",
  "message": "Detailed error message",
  "debug": { ... }
}
```

## Production Considerations

1. **Browser Management**: The current implementation reuses a single browser instance. For high traffic, consider:
   - Using a browser pool (e.g., `puppeteer-cluster`)
   - Implementing request queuing
   - Adding rate limiting

2. **Error Handling**: Add more robust error handling for:
   - Network timeouts
   - Form structure changes
   - Rate extraction failures

3. **Security**: 
   - Add authentication/authorization
   - Implement rate limiting
   - Add input validation and sanitization
   - Use environment variables for sensitive data

4. **Monitoring**: 
   - Add logging (e.g., Winston)
   - Set up error tracking (e.g., Sentry)
   - Monitor browser instance health

5. **Deployment**: 
   - Use PM2 or similar for process management
   - Set up reverse proxy (nginx)
   - Configure SSL/TLS

## Troubleshooting

If the form fields aren't being filled correctly:

1. Check the server logs for available form fields
2. Inspect the provider's website to identify actual field names/IDs
3. Update the `fieldMappings` in `server.js`
4. Test with a screenshot (uncomment the screenshot line in server.js)

If the interest rate isn't being extracted:

1. Check how the rate is displayed on the provider's site
2. Update the extraction selectors in the `page.evaluate()` section
3. Consider taking a screenshot for debugging

## License

ISC
```

---

## File: server-apify.js

```javascript
const express = require('express');
const cors = require('cors');
const { ApifyClient } = require('apify-client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Apify client
const APIFY_TOKEN = 'apify_api_BJJkrn8sbc0geOlnsjTdkgXQNXcbOq0AA0bj';
const client = new ApifyClient({ token: APIFY_TOKEN });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/Images', express.static('Images'));

// Increase timeouts for long-running scrapes
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'apify' });
});

// Main pricing endpoint
app.post('/api/get-pricing', async (req, res) => {
  try {
    console.log('\n🚀 Starting Apify scrape request...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const loanData = req.body.loanData || req.body;
    const testMode = req.body.testMode || false;
    
    console.log('Loan data:', JSON.stringify(loanData, null, 2));
    
    // Run the Apify Puppeteer Scraper actor
    const run = await client.actor('apify/puppeteer-scraper').call({
      startUrls: [{
        url: 'https://www.b-diya.nqxpricer.com/695e8559bfa826654b8fd62f'
      }],
      pageFunction: `async function pageFunction(context) {
        const { page, request, log } = context;
        
        // Loan data passed from the server
        const loanData = ${JSON.stringify(loanData)};
        
        // Helper function for delays
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        try {
          log.info('Page loaded, waiting for React to render form...');
          // Smart wait: Wait for form elements to be ready instead of fixed 12s delay
          await page.waitForSelector('input[placeholder="LTV"]', { timeout: 15000 });
          log.info('✅ Form loaded and ready!');
          
          // STEP 1: Fill text inputs using page.type() for proper React event handling
          log.info('Step 1: Filling text inputs...');
          
          const textInputs = [
            { id: ':r0:', value: loanData.loanAmount.toString(), label: 'Loan Amount' },
            { id: ':r1:', value: loanData.propertyValue.toString(), label: 'Property Value' }
          ];
          
          const textResult = [];
          
          for (const input of textInputs) {
            try {
              log.info('Filling ' + input.label + '...');
              const selector = '[id="' + input.id + '"]';
              
              // Click to focus
              await page.click(selector);
              await wait(100);
              
              // Select all and delete
              await page.keyboard.down('Control');
              await page.keyboard.press('KeyA');
              await page.keyboard.up('Control');
              await page.keyboard.press('Backspace');
              await wait(50);
              
              // Type the value (this triggers proper React events)
              await page.type(selector, input.value, { delay: 20 });
              await wait(100);
              
              // Press Tab to blur and commit the value
              await page.keyboard.press('Tab');
              await wait(200);
              
              // Verify the value
              const finalValue = await page.evaluate((id) => {
                const el = document.querySelector('[id="' + id + '"]');
                return el ? el.value : null;
              }, input.id);
              
              log.info(input.label + ' final value: ' + finalValue);
              
              if (finalValue === input.value || finalValue === input.value.replace(/^0+/, '')) {
                textResult.push('✅ ' + input.label + ': ' + input.value);
              } else {
                textResult.push('⚠️  ' + input.label + ': typed but value is ' + finalValue);
              }
            } catch (error) {
              log.info('❌ Error filling ' + input.label + ': ' + error.message);
              textResult.push('❌ ' + input.label);
            }
          }
          
          log.info('Text inputs result: ' + JSON.stringify(textResult));
          await wait(300);
          
          // STEP 2: Fill each dropdown ONE BY ONE
          log.info('Step 2: Filling dropdowns...');
          
          const dropdowns = [
            { label: 'LTV', value: ${JSON.stringify(loanData.ltv)} },
            { label: 'Loan Type', value: ${JSON.stringify(loanData.loanType)} },
            { label: 'Interest Only', value: ${JSON.stringify(loanData.interestOnly)} },
            { label: 'Loan Purpose', value: ${JSON.stringify(loanData.loanPurpose)} },
            { label: 'Property Type', value: ${JSON.stringify(loanData.propertyType)} },
            { label: 'Est. DSCR', value: ${JSON.stringify(loanData.dscr)} },
            { label: 'Stated FICO Score', value: ${JSON.stringify(loanData.ficoScore)} },
            { label: 'Prepayment Penalty', value: ${JSON.stringify(loanData.prepaymentPenalty)} },
            { label: 'TPO Premium', value: ${JSON.stringify(loanData.tpoPremium)} }
          ];
          
          const dropdownResults = [];
          
          for (const dropdown of dropdowns) {
            try {
              log.info('Filling: ' + dropdown.label + ' = ' + dropdown.value);
              
              // Find the combobox div - try multiple strategies
              const comboboxResult = await page.evaluate((placeholder) => {
                const input = Array.from(document.querySelectorAll('input')).find(
                  inp => inp.placeholder === placeholder
                );
                
                if (!input) {
                  return { success: false, error: 'Input not found' };
                }
                
                // Strategy 1: Check if input is inside a combobox (parent)
                let element = input.parentElement;
                while (element) {
                  if (element.getAttribute('role') === 'combobox') {
                    return { success: true, id: element.id, strategy: 'parent' };
                  }
                  element = element.parentElement;
                }
                
                // Strategy 2: Check for sibling combobox
                if (input.parentElement) {
                  const siblings = Array.from(input.parentElement.children);
                  const comboboxSibling = siblings.find(el => el.getAttribute('role') === 'combobox');
                  if (comboboxSibling && comboboxSibling.id) {
                    return { success: true, id: comboboxSibling.id, strategy: 'sibling' };
                  }
                }
                
                // Strategy 3: Find nearest combobox in the same container
                const container = input.closest('div');
                if (container) {
                  const nearbyCombobox = container.querySelector('[role="combobox"]');
                  if (nearbyCombobox && nearbyCombobox.id) {
                    return { success: true, id: nearbyCombobox.id, strategy: 'container' };
                  }
                }
                
                // Strategy 4: Look at grandparent level
                if (input.parentElement && input.parentElement.parentElement) {
                  const grandparent = input.parentElement.parentElement;
                  const comboboxInGrandparent = grandparent.querySelector('[role="combobox"]');
                  if (comboboxInGrandparent && comboboxInGrandparent.id) {
                    return { success: true, id: comboboxInGrandparent.id, strategy: 'grandparent' };
                  }
                }
                
                return { success: false, error: 'Combobox not found with any strategy' };
              }, dropdown.label);
              
              if (!comboboxResult.success) {
                log.info('❌ ' + dropdown.label + ': ' + comboboxResult.error);
                dropdownResults.push('❌ ' + dropdown.label + ' - combobox not found');
                continue;
              }
              
              log.info('✅ Found combobox ID: ' + comboboxResult.id + ' (strategy: ' + comboboxResult.strategy + ')');
              
              // Click the combobox div using attribute selector (IDs start with : which breaks CSS)
              const selector = '[id="' + comboboxResult.id + '"]';
              
              try {
                await page.click(selector);
                log.info('✅ Clicked combobox: ' + dropdown.label);
              } catch (clickErr) {
                log.info('❌ Failed to click combobox: ' + clickErr.message);
                dropdownResults.push('❌ ' + dropdown.label + ' - click failed');
                continue;
              }
              
              // Smart wait: Wait for dropdown options to appear instead of fixed delay
              try {
                await page.waitForSelector('[role="option"], .MuiMenuItem-root', { timeout: 3000 });
              } catch (waitErr) {
                log.info('⚠️  Timeout waiting for options, continuing anyway...');
              }
              
              // Try multiple selectors to find options
              const availableOptions = await page.evaluate(() => {
                let opts = Array.from(document.querySelectorAll('[role="option"]'));
                if (opts.length === 0) {
                  opts = Array.from(document.querySelectorAll('.MuiMenuItem-root'));
                }
                if (opts.length === 0) {
                  opts = Array.from(document.querySelectorAll('li[role="option"]'));
                }
                if (opts.length === 0) {
                  opts = Array.from(document.querySelectorAll('ul[role="listbox"] li'));
                }
                if (opts.length === 0) {
                  // Last resort - visible li elements
                  opts = Array.from(document.querySelectorAll('li'))
                    .filter(li => li.offsetParent !== null);
                }
                
                return opts.map(o => o.textContent.trim());
              });
              
              log.info('Found ' + availableOptions.length + ' options: ' + JSON.stringify(availableOptions.slice(0, 10)));
              
              if (availableOptions.length === 0) {
                log.info('❌ No options found for ' + dropdown.label);
                dropdownResults.push('❌ ' + dropdown.label + ' - no options');
                continue;
              }
              
              // Click the matching option using multiple strategies
              const optionResult = await page.evaluate((valueText) => {
                // Try different selectors
                let options = Array.from(document.querySelectorAll('[role="option"]'));
                if (options.length === 0) options = Array.from(document.querySelectorAll('.MuiMenuItem-root'));
                if (options.length === 0) options = Array.from(document.querySelectorAll('li[role="option"]'));
                if (options.length === 0) options = Array.from(document.querySelectorAll('ul[role="listbox"] li'));
                if (options.length === 0) {
                  options = Array.from(document.querySelectorAll('li'))
                    .filter(li => li.offsetParent !== null);
                }
                
                // Find matching option (flexible matching)
                const match = options.find(opt => {
                  const text = opt.textContent.trim();
                  return text.toLowerCase().includes(valueText.toLowerCase()) || 
                         valueText.toLowerCase().includes(text.toLowerCase());
                });
                
                if (match) {
                  match.click();
                  return { success: true, text: match.textContent.trim() };
                }
                
                return { 
                  success: false, 
                  error: 'Option not found in list'
                };
              }, dropdown.value);
              
              if (optionResult.success) {
                log.info('✅ Selected: ' + optionResult.text);
                dropdownResults.push('✅ ' + dropdown.label + ': ' + optionResult.text);
              } else {
                log.info('⚠️  Could not find "' + dropdown.value + '" in available options');
                dropdownResults.push('⚠️  ' + dropdown.label + ' - option not found');
              }
              
              // Wait for dropdown to fully close and clear from DOM
              try {
                await page.waitForFunction(() => {
                  return document.querySelector('[role="listbox"]') === null;
                }, { timeout: 2000 });
              } catch (e) {
                // Fallback if listbox doesn't disappear
                await wait(400);
              }
              
              await wait(200); // Additional buffer for React state update
              
            } catch (err) {
              log.info('❌ Error with ' + dropdown.label + ': ' + err.message);
              dropdownResults.push('❌ ' + dropdown.label + ' error');
            }
          }
          
          log.info('Dropdown results: ' + JSON.stringify(dropdownResults));
          
          const formResult = { 
            success: true, 
            textInputs: textResult,
            dropdowns: dropdownResults
          };
          
          log.info('Form fill result: ' + JSON.stringify(formResult));
          
          await wait(300);
          
          // Try to click Calculate Rate
          log.info('Looking for Calculate Rate button...');
          const buttonResult = await page.evaluate(() => {
            try {
              const buttons = Array.from(document.querySelectorAll('button'));
              const calcButton = buttons.find(btn => 
                btn.textContent && btn.textContent.toLowerCase().includes('calculate')
              );
              if (calcButton) {
                calcButton.click();
                return { clicked: true, text: calcButton.textContent };
              }
              return { clicked: false, buttonCount: buttons.length, buttonTexts: buttons.map(b => b.textContent).slice(0, 5) };
            } catch (err) {
              return { clicked: false, error: err.message };
            }
          });
          
          log.info('Button click result: ' + JSON.stringify(buttonResult));
          
          let interestRate = null;
          let rateDebugInfo = null;
          
          if (buttonResult.clicked) {
            log.info('Waiting for calculation results...');
            
            // Minimum wait for calculation to process (API call takes time)
            await wait(3000);
            
            // Smart wait: Look for actual results (rate percentage or ineligible message)
            try {
              await page.waitForFunction(() => {
                const bodyText = document.body.innerText;
                // Look for rate percentage pattern (e.g., "6.395%") or specific result indicators
                const hasRatePattern = /\d+\.\d{3,4}%/.test(bodyText);
                const hasIneligible = bodyText.includes('INELIGIBLE PRODUCT');
                const hasEligibleProducts = bodyText.includes('ELIGIBLE PRODUCTS');
                
                return hasRatePattern || hasIneligible || hasEligibleProducts;
              }, { timeout: 10000 });
              log.info('✅ Results appeared!');
            } catch (waitErr) {
              log.info('⚠️  Timeout waiting for results, continuing anyway...');
            }
            
            // Take screenshot for debugging
            log.info('📸 Taking screenshot after calculation...');
            await context.saveSnapshot();
            
            // Extract the interest rate with proper ineligible detection
            log.info('🔍 Extracting interest rate...');
            const rateExtraction = await page.evaluate(() => {
              try {
                const bodyText = document.body.innerText;
                
                // Check for INELIGIBLE text
                const hasIneligible = bodyText.includes('INELIGIBLE PRODUCT');
                const hasEligible = bodyText.includes('ELIGIBLE PRODUCTS');
                const hasBaseRates = bodyText.includes('Base Rates') || bodyText.includes('Base Rate');
                
                // Try to find rate first
                let rate = null;
                let productType = null;
                
                // Look for rate
                if (true) {
                  // Strategy 1: Find percentage in format X.XXX%
                  const rateMatch = bodyText.match(/(\\d+\\.\\d{3,4}%)/);
                  if (rateMatch) {
                    rate = rateMatch[1];
                  }
                  
                  // Strategy 2: Look in right panel
                  const rightPanel = Array.from(document.querySelectorAll('div')).find(div => {
                    const text = div.textContent;
                    return (text.includes('ELIGIBLE PRODUCTS') || text.includes('Base Rate')) && 
                           text.length < 2000;
                  });
                  
                  if (rightPanel && !rate) {
                    const panelMatch = rightPanel.textContent.match(/(\\d+\\.\\d{3,4}%)/);
                    if (panelMatch) rate = panelMatch[1];
                  }
                  
                  // Strategy 3: Look for orange-colored elements
                  if (!rate) {
                    const orangeElements = Array.from(document.querySelectorAll('*')).filter(el => {
                      const style = window.getComputedStyle(el);
                      const color = style.color;
                      return (color.includes('rgb(255, 87, 34)') || 
                              color.includes('#ff5722')) &&
                             el.textContent.trim().match(/^\\d+\\.\\d+%$/);
                    });
                    
                    if (orangeElements.length > 0) {
                      rate = orangeElements[0].textContent.trim();
                    }
                  }
                  
                  // Find product type
                  if (bodyText.includes('30 YR Fixed Rate')) {
                    productType = '30 YR Fixed Rate';
                  } else if (bodyText.includes('10/6 ARM')) {
                    productType = '10/6 ARM (30 YR)';
                  } else if (bodyText.includes('7/6 ARM')) {
                    productType = '7/6 ARM (30 YR)';
                  } else if (bodyText.includes('5/6 ARM')) {
                    productType = '5/6 ARM (30 YR)';
                  }
                }
                
                // If no rate found AND INELIGIBLE text exists, mark as ineligible
                if (!rate && hasIneligible) {
                  return {
                    success: false,
                    isIneligible: true,
                    message: 'Loan is ineligible',
                    hasEligible: hasEligible,
                    hasIneligible: hasIneligible,
                    hasBaseRates: hasBaseRates
                  };
                }
                
                // Return result
                return {
                  success: !!rate,
                  isIneligible: false,
                  rate: rate,
                  productType: productType,
                  hasEligible: hasEligible,
                  hasIneligible: hasIneligible,
                  hasBaseRates: hasBaseRates,
                  bodySnippet: bodyText.substring(0, 2000)
                };
              } catch (err) {
                return { success: false, error: err.message };
              }
            });
            
            log.info('📊 Rate Extraction Result:');
            
            if (rateExtraction.isIneligible) {
              log.info('❌ LOAN IS INELIGIBLE');
              log.info('Message: ' + rateExtraction.message);
              interestRate = null;
              rateDebugInfo = rateExtraction;
            } else if (rateExtraction.success && rateExtraction.rate) {
              log.info('✅ SUCCESS! Interest Rate: ' + rateExtraction.rate);
              if (rateExtraction.productType) {
                log.info('Product Type: ' + rateExtraction.productType);
              }
              interestRate = rateExtraction.rate;
              rateDebugInfo = rateExtraction;
            } else {
              log.info('⚠️  Could not extract rate from page');
              log.info('Has Eligible: ' + rateExtraction.hasEligible);
              log.info('Has Ineligible: ' + rateExtraction.hasIneligible);
              log.info('Has Base Rates: ' + rateExtraction.hasBaseRates);
              log.info('Body snippet: ' + rateExtraction.bodySnippet);
              interestRate = null;
              rateDebugInfo = rateExtraction;
            }
          }
          
          // Return results
          const isIneligible = rateDebugInfo && rateDebugInfo.isIneligible;
          
          return {
            success: interestRate !== null && !isIneligible,
            interestRate: interestRate,
            isIneligible: isIneligible,
            message: isIneligible ? 'Loan is ineligible' : null,
            url: request.url,
            pageTitle: await page.title(),
            formResult: formResult,
            buttonResult: buttonResult,
            rateDebugInfo: rateDebugInfo,
            loanData: loanData
          };
          
        } catch (error) {
          log.error('Error in pageFunction: ' + error.message);
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      }`,
      proxyConfiguration: {
        useApifyProxy: true
      },
      maxRequestsPerCrawl: 1,
      maxConcurrency: 1
    });
    
    console.log(`✅ Apify run started: ${run.id}`);
    console.log(`🔗 View run: https://console.apify.com/actors/runs/${run.id}`);
    
    // Wait for run to finish
    console.log('⏳ Waiting for Apify to complete...');
    await client.run(run.id).waitForFinish();
    
    // Fetch results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log('📊 Results:', JSON.stringify(items, null, 2));
    
    if (items && items.length > 0) {
      const result = items[0];
      
      console.log('✅ Apify scrape completed!');
      console.log('Interest rate:', result.interestRate);
      console.log('Is Ineligible:', result.isIneligible);
      console.log('Success:', result.success);
      
      // Check if loan is ineligible
      if (result.isIneligible) {
        res.json({
          success: false,
          isIneligible: true,
          message: 'Loan is ineligible',
          loanData: result.loanData,
          apifyRunId: run.id
        });
      } else if (result.success && result.interestRate) {
        res.json({
          success: true,
          interestRate: result.interestRate,
          loanData: result.loanData,
          apifyRunId: run.id
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Could not extract interest rate from page',
          apifyRunId: run.id,
          debug: result
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'No results from Apify',
        apifyRunId: run.id
      });
    }
    
  } catch (error) {
    console.error('❌ Apify error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`🔧 Using Apify for web scraping`);
});
```

---

## File: server.js

```javascript
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper function for getting pricing (used by both endpoints)
async function getPricing(loanData, testMode = false) {
  let browser = null;
  let page = null;
  
  try {
    console.log(testMode ? '🧪 TEST MODE: Launching browser with Playwright...' : 'Launching browser with Playwright...');
    
    // Create a fresh browser instance with Playwright
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        slowMo: testMode ? 100 : 0
      });
      
      console.log('✅ Playwright browser launched successfully');
    } catch (launchError) {
      console.error('❌ Failed to launch browser:', launchError);
      throw new Error(`Browser launch failed: ${launchError.message}`);
    }
    
    // Navigate to the actual website with multiple retry attempts
    // Create a fresh page for each attempt to avoid "main frame" errors
    let navigationSuccess = false;
    let lastError = null;
    
    console.log('Navigating to Diya website...');
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt}/3...`);
        
        // Close old page if it exists
        if (page) {
          try {
            await page.close();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        // Create a new context (like incognito) and page for this attempt
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });
        
        page = await context.newPage();
        
        // Set timeout
        page.setDefaultTimeout(60000);
        
        // Try navigation
        await page.goto('https://www.b-diya.nqxpricer.com/695e8559bfa826654b8fd62f', {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
        
        navigationSuccess = true;
        console.log('✅ Navigation successful');
        break;
        
      } catch (navError) {
        lastError = navError;
        console.error(`❌ Navigation attempt ${attempt} failed:`, navError.message);
        
        // Take screenshot on last attempt if page exists
        if (attempt === 3 && page) {
          try {
            await page.screenshot({ path: 'navigation-error.png' });
            console.log('Error screenshot saved to navigation-error.png');
          } catch (e) {
            // Ignore screenshot errors
          }
        }
        
        // Wait before retry (using plain setTimeout, not page methods)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (!navigationSuccess) {
      throw new Error(`Failed to navigate after 3 attempts: ${lastError.message}`);
    }
    
    // Wait for page to fully load and become interactive
    console.log('⏳ Waiting for page to load...');
    if (testMode) {
      await page.screenshot({ path: 'test-step-1-loaded.png' });
      console.log('📸 Screenshot 1: Page loaded');
    }
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Wait for the page to be ready (React app to mount)
    try {
      await page.waitForLoadState('load', { timeout: 15000 });
      console.log('✅ Page load complete');
    } catch (e) {
      console.log('Timeout waiting for load, continuing anyway');
    }
    
    // Wait extra time for React/JavaScript to render
    console.log('⏳ Waiting for React to render (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'debug-page-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-page-loaded.png');
    
    // Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasSelects: document.querySelectorAll('select').length,
        hasInputs: document.querySelectorAll('input').length,
        hasButtons: document.querySelectorAll('button').length,
        bodyText: document.body?.innerText?.substring(0, 500) || 'No body text'
      };
    });
    
    console.log('📊 Page analysis:', JSON.stringify(pageContent, null, 2));
    
    // Wait for the form elements to be ready
    console.log('🔍 Waiting for form elements...');
    console.log('ℹ️  Detected custom dropdown components (not native <select> elements)');
    
    // Look for input fields to confirm form is ready
    await page.waitForSelector('input', { timeout: 5000, state: 'visible' });
    console.log('✅ Form inputs found');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Extra wait
    
    if (testMode) {
      await page.screenshot({ path: 'test-step-2-form-ready.png' });
      console.log('📸 Screenshot 2: Form ready');
    }

    // Extract all form fields on the page for debugging
    let formFields = [];
    let attempts = 0;
    while (attempts < 5) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        formFields = await page.evaluate(() => {
          if (!document.body) return [];
          const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
          return inputs.map(input => ({
            name: input.name || input.id || '',
            type: input.type || input.tagName.toLowerCase(),
            id: input.id || '',
            placeholder: input.placeholder || '',
            label: input.labels?.[0]?.textContent || ''
          }));
        });
        if (formFields.length > 0) {
          console.log('Available form fields:', formFields.length);
          break;
        }
        attempts++;
      } catch (evalError) {
        attempts++;
        console.log(`Attempt ${attempts} to extract form fields failed:`, evalError.message);
        if (attempts >= 5) {
          throw new Error('Could not access page after multiple attempts. The page may be blocking automation.');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Map common loan fields to form inputs
    // These match the actual field names on Diya's site
    const fieldMappings = {
      loanAmount: ['loanAmount', 'amount', 'loan_amount', 'principal'],
      propertyValue: ['propertyValue', 'property_value', 'homeValue', 'home_value'],
      ltv: ['ltv', 'LTV', 'loan_to_value'],
      dscr: ['dscr', 'DSCR', 'debt_service_coverage'],
      interestOnly: ['interestOnly', 'interest_only', 'io'],
      ficoScore: ['ficoScore', 'fico', 'credit_score', 'stated_fico'],
      loanPurpose: ['loanPurpose', 'loan_purpose', 'purpose'],
      propertyType: ['propertyType', 'property_type', 'homeType'],
      tpoPremium: ['tpoPremium', 'tpo_premium', 'premium'],
      loanType: ['loanType', 'loan_type', 'product'],
      prepaymentPenalty: ['prepaymentPenalty', 'prepayment_penalty', 'prepay']
    };

    // Helper to fill text input using multiple methods
    async function fillTextInput(page, labelText, value) {
      if (!value) return false;
      
      try {
        console.log(`Filling ${labelText} with ${value}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try Method 1: Playwright's getByLabel (accessibility-based)
        try {
          const input = page.getByLabel(labelText, { exact: false });
          const count = await input.count();
          if (count > 0) {
            await input.first().click();
            await input.first().fill(String(value));
            console.log(`✅ Filled ${labelText} (method 1)`);
            return true;
          }
        } catch (e) {
          console.log(`Method 1 failed: ${e.message}`);
        }
        
        // Try Method 2: Find by label ID
        const filled = await page.evaluate((label, val) => {
          const labels = Array.from(document.querySelectorAll('label'));
          const labelEl = labels.find(l => l.textContent.includes(label));
          if (labelEl) {
            const forId = labelEl.getAttribute('for');
            if (forId) {
              const input = document.querySelector(`#${forId}`);
              if (input && input.tagName === 'INPUT') {
                input.value = val;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
              }
            }
          }
          return false;
        }, labelText, String(value));
        
        if (filled) {
          console.log(`✅ Filled ${labelText} (method 2)`);
          return true;
        }
        
        console.log(`⚠️  Could not fill ${labelText}`);
        return false;
      } catch (error) {
        console.log(`❌ Error filling ${labelText}: ${error.message}`);
        return false;
      }
    }
    
    // Helper to select from Material-UI dropdown
    async function selectDropdown(page, labelText, value) {
      if (!value) return false;
      
      try {
        console.log(`Selecting ${labelText} = ${value}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Close any open dropdown
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Click the dropdown to open it
        const opened = await page.evaluate((label) => {
          const labels = Array.from(document.querySelectorAll('label'));
          const labelEl = labels.find(l => l.textContent.trim().includes(label));
          if (labelEl) {
            const forId = labelEl.getAttribute('for');
            if (forId) {
              const selectElement = document.querySelector(`#${forId}`);
              if (selectElement) {
                const button = selectElement.parentElement?.querySelector('[role="button"]');
                if (button) {
                  button.click();
                  return true;
                }
              }
            }
          }
          return false;
        }, labelText);
        
        if (!opened) {
          console.log(`⚠️  Could not open dropdown ${labelText}`);
          return false;
        }
        
        // Wait for menu
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select the option
        const option = page.locator(`li[role="option"]`).filter({ hasText: value });
        const count = await option.count();
        
        if (count > 0) {
          await option.first().click();
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`✅ Selected ${labelText} = ${value}`);
          return true;
        } else {
          console.log(`⚠️  Option "${value}" not found for ${labelText}`);
          await page.keyboard.press('Escape');
          return false;
        }
      } catch (error) {
        console.log(`❌ Error with ${labelText}: ${error.message}`);
        try { await page.keyboard.press('Escape'); } catch (e) {}
        return false;
      }
    }

    // Fill in the form fields one by one
    console.log('📝 Starting form fill...');
    
    // Text inputs
    await fillTextInput(page, 'Loan Amount', loanData.loanAmount);
    await fillTextInput(page, 'Est. Value / Purchase Price', loanData.propertyValue);
    
    if (testMode) {
      await page.screenshot({ path: 'test-step-2.5-text-filled.png' });
      console.log('📸 Screenshot: Text inputs filled');
    }
    
    // Dropdowns
    await selectDropdown(page, 'LTV', loanData.ltv);
    await selectDropdown(page, 'Loan Type', loanData.loanType);
    await selectDropdown(page, 'Interest Only', loanData.interestOnly);
    await selectDropdown(page, 'Loan Purpose', loanData.loanPurpose);
    await selectDropdown(page, 'Property Type', loanData.propertyType);
    await selectDropdown(page, 'Est. DSCR', loanData.dscr);
    await selectDropdown(page, 'Stated FICO Score', loanData.ficoScore);
    await selectDropdown(page, 'Prepayment Penalty', loanData.prepaymentPenalty);
    await selectDropdown(page, 'TPO Premium', loanData.tpoPremium);

    // Wait a bit for any dynamic updates
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (testMode) {
      await page.screenshot({ path: 'test-step-3-fields-filled.png' });
      console.log('📸 Screenshot 3: All fields filled');
    }

    // Click the "Calculate Rate" button
    console.log('Looking for Calculate Rate button...');
    let buttonClicked = false;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to find and click the button using a simpler approach
        const buttonFound = await page.evaluate(() => {
          if (!document.body) return false;
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
          const calcButton = buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('calculate') ||
            btn.value?.toLowerCase().includes('calculate')
          );
          if (calcButton) {
            calcButton.click();
            return true;
          }
          return false;
        });

        if (buttonFound) {
          buttonClicked = true;
          console.log('✅ Clicked Calculate Rate button');
          if (testMode) {
            await page.screenshot({ path: 'test-step-4-button-clicked.png' });
            console.log('📸 Screenshot 4: Calculate button clicked');
          }
          
          // Wait for results to load (increase timeout for calculation)
          await new Promise(resolve => setTimeout(resolve, 7000));
          if (testMode) {
            await page.screenshot({ path: 'test-step-5-results-loaded.png' });
            console.log('📸 Screenshot 5: Results should be loaded');
          }
          
          // Wait for results to appear
          try {
            await page.waitForFunction(() => {
              if (!document.body) return false;
              const text = document.body.textContent.toLowerCase();
              return text.includes('eligible product') || text.includes('interest rate');
            }, { timeout: 15000 });
            console.log('Results loaded');
          } catch (waitError) {
            console.log('Timeout waiting for results, continuing anyway');
          }
          
          break;
        } else {
          console.log(`Calculate button not found (attempt ${attempt + 1})`);
        }
      } catch (err) {
        console.log(`Error on attempt ${attempt + 1}:`, err.message);
        if (attempt === 2) {
          console.log('Could not click calculate button after 3 attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Extract the interest rate from the Eligible Products section
    let rateData = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        rateData = await page.evaluate(() => {
          if (!document.body) return null;
          
          // Look for "Eligible Products" section
          const allText = document.body.innerText;
          const allElements = Array.from(document.querySelectorAll('*'));
          
          // Find elements containing "eligible product"
          const eligibleProductElements = allElements.filter(el => 
            el.textContent?.toLowerCase().includes('eligible product')
          );
          
          // If we found the section, look for rates nearby
          if (eligibleProductElements.length > 0) {
            for (const elem of eligibleProductElements) {
              // Get the parent container
              let container = elem.closest('div, section, article, table');
              if (!container) container = elem.parentElement;
              
              // Look for rate in this container
              const containerText = container?.textContent || '';
              const rateMatch = containerText.match(/(\d+\.?\d*)\s*%/);
              
              if (rateMatch) {
                return {
                  rate: parseFloat(rateMatch[1]),
                  fullText: containerText.trim().substring(0, 500) // Get context
                };
              }
            }
          }
          
          // Fallback: look for any rate on the page after calculate
          const rateMatches = allText.match(/(\d+\.?\d*)\s*%/g);
          if (rateMatches && rateMatches.length > 0) {
            for (const match of rateMatches) {
              const rate = parseFloat(match);
              if (rate > 0 && rate < 30) {
                return {
                  rate: rate,
                  fullText: `Rate found: ${rate}%`
                };
              }
            }
          }
          
          return null;
        });
        
        if (rateData && rateData.rate) {
          console.log('Successfully extracted rate:', rateData.rate);
          break;
        }
        
        console.log(`Rate extraction attempt ${attempt + 1} returned no results`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (extractError) {
        console.log(`Error extracting rate (attempt ${attempt + 1}):`, extractError.message);
        if (attempt === 2) {
          console.log('Could not extract rate after 3 attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const interestRate = rateData?.rate || null;
    const rateContext = rateData?.fullText || '';
    
    console.log('Extracted rate:', interestRate);
    console.log('Rate context:', rateContext);

    // Take a screenshot for debugging
    const screenshotPath = testMode ? 'test-step-6-final-result.png' : 'debug-result.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Final screenshot saved to ${screenshotPath}`);

    await page.close();

    if (interestRate === null) {
      throw new Error('Could not extract interest rate from the page. Check the screenshot.');
    }

    return {
      success: true,
      interestRate: interestRate,
      rateContext: rateContext,
      loanData: loanData
    };

  } catch (error) {
    console.error('Error getting pricing:', error);
    throw error;
  } finally {
    // Clean up browser and page
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e.message);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e.message);
      }
    }
  }
}

// API endpoint to get loan pricing (production mode - headless)
app.post('/api/get-pricing', async (req, res) => {
  // Increase timeout to 5 minutes for Puppeteer operations
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  try {
    const loanData = req.body;
    
    if (!loanData) {
      return res.status(400).json({ error: 'Loan data is required' });
    }

    const result = await getPricing(loanData, false);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get loan pricing',
      message: error.message
    });
  }
});

// TEST endpoint - runs with visible browser so you can watch
app.post('/api/test-pricing', async (req, res) => {
  // Increase timeout to 5 minutes for test mode
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  try {
    const loanData = req.body;
    
    if (!loanData) {
      return res.status(400).json({ error: 'Loan data is required' });
    }

    console.log('🧪 TEST MODE ACTIVATED - Browser will be visible');
    const result = await getPricing(loanData, true);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get loan pricing',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## File: public/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sphinx Capital - Loan Pricing Tool</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #003087 0%, #0041a8 100%);
            min-height: 100vh;
            padding: 0;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow-x: hidden;
        }

        .header {
            background: #003087;
            padding: 20px 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-link {
            display: inline-block;
            transition: opacity 0.3s ease;
        }

        .logo-link:hover {
            opacity: 0.9;
        }

        .logo {
            height: 60px;
            width: auto;
        }

        .main-content {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 24px 48px rgba(0, 48, 135, 0.15), 0 0 0 1px rgba(0, 48, 135, 0.05);
            max-width: 650px;
            width: 100%;
            padding: 48px;
            position: relative;
            z-index: 1;
            animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        h1 {
            color: #003087;
            margin-bottom: 12px;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        .subtitle {
            color: #64748b;
            margin-bottom: 36px;
            font-size: 15px;
            line-height: 1.6;
        }

        .form-group {
            margin-bottom: 24px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #1e293b;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.3px;
        }

        input, select {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: #f8fafc;
            color: #1e293b;
        }

        input:hover, select:hover {
            border-color: #cbd5e1;
        }

        input:focus, select:focus {
            outline: none;
            border-color: #003087;
            background: white;
            box-shadow: 0 0 0 4px rgba(0, 48, 135, 0.1);
        }

        .submit-btn {
            width: 100%;
            padding: 16px;
            background: #003087;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 12px;
            box-shadow: 0 4px 12px rgba(0, 48, 135, 0.3);
            letter-spacing: 0.3px;
        }

        .submit-btn:hover {
            background: #0041a8;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 48, 135, 0.4);
        }

        .submit-btn:active {
            transform: translateY(0);
        }

        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .result {
            margin-top: 32px;
            padding: 24px;
            border-radius: 16px;
            display: none;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .result.success {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 2px solid #10b981;
            border-left: 6px solid #10b981;
            color: #065f46;
            display: block;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .result.error {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 2px solid #ef4444;
            border-left: 6px solid #ef4444;
            color: #991b1b;
            display: block;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .result.warning {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border: 2px solid #f59e0b;
            border-left: 6px solid #f59e0b;
            color: #92400e;
            display: block;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .result h3 {
            margin-bottom: 12px;
            font-size: 20px;
            font-weight: 700;
        }

        .interest-rate {
            font-size: 48px;
            font-weight: 800;
            margin: 16px 0;
            color: #003087;
            letter-spacing: -1px;
        }

        .loading {
            display: none;
            text-align: center;
            margin-top: 24px;
        }

        .loading.active {
            display: block;
        }

        .spinner {
            border: 4px solid #e2e8f0;
            border-top: 4px solid #003087;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            margin-top: 12px;
            font-size: 14px;
            line-height: 1.5;
        }

        ul {
            list-style: none;
            padding: 0;
        }

        ul li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
            color: #334155;
            font-size: 15px;
        }

        ul li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #003087;
            font-weight: bold;
        }

        @media (max-width: 640px) {
            .header {
                padding: 15px 20px;
            }

            .logo {
                height: 45px;
            }

            .main-content {
                padding: 30px 20px;
            }

            .container {
                padding: 32px 24px;
            }

            h1 {
                font-size: 28px;
            }

            .interest-rate {
                font-size: 40px;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <a href="/" class="logo-link">
            <img src="/Images/Sphinx Logo.jpeg" alt="Sphinx Capital" class="logo">
        </a>
    </header>
    
    <div class="main-content">
        <div class="container">
            <h1>Loan Pricing Calculator</h1>
            <p class="subtitle">Get your personalized interest rate in seconds. Simply fill out the form below and we'll calculate your best available rate.</p>

        <form id="loanForm">
            <div class="form-group">
                <label for="loanAmount">Loan Amount ($)</label>
                <input type="number" id="loanAmount" name="loanAmount" required min="0" step="1000" placeholder="e.g., 300000">
            </div>

            <div class="form-group">
                <label for="propertyValue">Property Value ($)</label>
                <input type="number" id="propertyValue" name="propertyValue" required min="0" step="1000" placeholder="e.g., 400000">
            </div>

            <div class="form-group">
                <label for="ltv">LTV *</label>
                <select id="ltv" name="ltv" required>
                    <option value="">Select LTV</option>
                    <option value="≤ 50%">≤ 50%</option>
                    <option value="50.01% - 55%">50.01% - 55%</option>
                    <option value="55.01% - 60%">55.01% - 60%</option>
                    <option value="60.01% - 65%">60.01% - 65%</option>
                    <option value="65.01% - 70%">65.01% - 70%</option>
                    <option value="70.01% - 75%">70.01% - 75%</option>
                    <option value="75.01% - 80%">75.01% - 80%</option>
                </select>
            </div>

            <div class="form-group">
                <label for="dscr">Est. DSCR *</label>
                <select id="dscr" name="dscr" required>
                    <option value="">Select DSCR</option>
                    <option value="1.0x - 1.19x">1.0x - 1.19x</option>
                    <option value="1.20x+">1.20x+</option>
                </select>
            </div>

            <div class="form-group">
                <label for="interestOnly">Interest Only *</label>
                <select id="interestOnly" name="interestOnly" required>
                    <option value="">Select option</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>

            <div class="form-group">
                <label for="ficoScore">Stated FICO Score *</label>
                <select id="ficoScore" name="ficoScore" required>
                    <option value="">Select FICO score</option>
                    <option value="780+">780+</option>
                    <option value="760 - 779">760 - 779</option>
                    <option value="740 - 759">740 - 759</option>
                    <option value="720 - 739">720 - 739</option>
                    <option value="700 - 719">700 - 719</option>
                    <option value="680 - 699">680 - 699</option>
                    <option value="660 - 679">660 - 679</option>
                </select>
            </div>

            <div class="form-group">
                <label for="loanPurpose">Loan Purpose *</label>
                <select id="loanPurpose" name="loanPurpose" required>
                    <option value="">Select loan purpose</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Rate / Term Refinance">Rate / Term Refinance</option>
                    <option value="Cash Out Refinance">Cash Out Refinance</option>
                </select>
            </div>

            <div class="form-group">
                <label for="propertyType">Property Type *</label>
                <select id="propertyType" name="propertyType" required>
                    <option value="">Select property type</option>
                    <option value="Single Family">Single Family</option>
                    <option value="2-4 Unit">2-4 Unit</option>
                    <option value="Portfolio (1-4 Unit)">Portfolio (1-4 Unit)</option>
                    <option value="Warrantable Condo">Warrantable Condo</option>
                    <option value="Non-Warrantable Condo">Non-Warrantable Condo</option>
                </select>
            </div>

            <div class="form-group">
                <label for="tpoPremium">TPO Premium *</label>
                <select id="tpoPremium" name="tpoPremium" required>
                    <option value="">Select TPO premium</option>
                    <option value="No TPO Premium">No TPO Premium</option>
                    <option value="0.25%">0.25%</option>
                    <option value="0.50%">0.50%</option>
                    <option value="0.75%">0.75%</option>
                    <option value="1.00%">1.00%</option>
                    <option value="1.25%">1.25%</option>
                    <option value="1.5%">1.5%</option>
                    <option value="1.75%">1.75%</option>
                    <option value="2.0%">2.0%</option>
                    <option value="2.25%">2.25%</option>
                    <option value="2.5%">2.5%</option>
                </select>
            </div>

            <div class="form-group">
                <label for="loanType">Loan Type *</label>
                <select id="loanType" name="loanType" required>
                    <option value="">Select loan type</option>
                    <option value="30 YR Fixed Rate">30 YR Fixed Rate</option>
                    <option value="10/6 ARM (30 YR)">10/6 ARM (30 YR)</option>
                    <option value="7/6 ARM (30 YR)">7/6 ARM (30 YR)</option>
                    <option value="5/6 ARM (30 YR)">5/6 ARM (30 YR)</option>
                </select>
            </div>

            <div class="form-group">
                <label for="prepaymentPenalty">Prepayment Penalty *</label>
                <select id="prepaymentPenalty" name="prepaymentPenalty" required>
                    <option value="">Select prepayment penalty</option>
                    <option value="5-Year (54321)">5-Year (54321)</option>
                    <option value="3-Year (321)">3-Year (321)</option>
                    <option value="2-Year (320)">2-Year (320)</option>
                    <option value="1-Year (300)">1-Year (300)</option>
                </select>
            </div>

            <button type="submit" class="submit-btn" id="submitBtn">Get Interest Rate</button>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p style="margin-top: 10px; color: #666;">Calculating your rate...</p>
        </div>

        <div class="result" id="result">
            <h3 id="resultTitle"></h3>
            <div id="resultContent"></div>
        </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('loanForm');
        const submitBtn = document.getElementById('submitBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        const resultTitle = document.getElementById('resultTitle');
        const resultContent = document.getElementById('resultContent');

        async function submitForm(isTestMode = false) {
            const endpoint = isTestMode ? '/api/test-pricing' : '/api/get-pricing';
            const btnText = isTestMode ? '🧪 Running Test...' : 'Calculating...';
            const originalText = isTestMode ? '🧪 Test Mode (Watch Browser)' : 'Get Interest Rate';
            const activeBtn = isTestMode ? testBtn : submitBtn;

            // Hide previous results
            result.classList.remove('success', 'error');
            loading.classList.add('active');
            submitBtn.disabled = true;
            activeBtn.textContent = btnText;

            // Collect form data
            const formData = new FormData(form);
            const loanData = {
                loanAmount: formData.get('loanAmount'),
                propertyValue: formData.get('propertyValue'),
                ltv: formData.get('ltv'),
                dscr: formData.get('dscr'),
                interestOnly: formData.get('interestOnly'),
                ficoScore: formData.get('ficoScore'),
                loanPurpose: formData.get('loanPurpose'),
                propertyType: formData.get('propertyType'),
                tpoPremium: formData.get('tpoPremium'),
                loanType: formData.get('loanType'),
                prepaymentPenalty: formData.get('prepaymentPenalty')
            };

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loanData)
                });

                const data = await response.json();
                
                // Debug logging
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                console.log('Response data:', data);
                console.log('Is ineligible?', data.isIneligible);

                loading.classList.remove('active');
                submitBtn.disabled = false;
                activeBtn.textContent = originalText;

                if (data.isIneligible) {
                    console.log('Showing ineligible message');
                    // Loan is ineligible - NOT an error, just a status
                    result.classList.remove('success', 'error', 'warning');
                    result.classList.add('warning');
                    result.style.display = 'block';
                    result.style.background = 'linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%)';
                    result.style.borderLeft = '5px solid #ff9800';
                    resultTitle.textContent = 'Loan is Ineligible';
                    resultTitle.style.color = '#ff6f00';
                    resultContent.innerHTML = `
                        <p style="font-size: 18px; color: #ff6f00; font-weight: 600; margin-bottom: 15px;">
                            ⚠️ This loan does not meet eligibility requirements.
                        </p>
                        <p style="color: #666; margin-bottom: 10px;">
                            Based on your loan parameters, no eligible products are currently available.
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            Please adjust your loan details and try again, or contact us for alternative options.
                        </p>
                    `;
                    console.log('Ineligible message HTML set, result display:', result.style.display);
                } else if (response.ok && data.success) {
                    result.classList.add('success');
                    resultTitle.textContent = 'Your Interest Rate';
                    resultContent.innerHTML = `
                        <div class="interest-rate">${data.interestRate}</div>
                        <p>Based on your loan details:</p>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            <li>Loan Amount: $${parseInt(data.loanData.loanAmount).toLocaleString()}</li>
                            <li>Property Value: $${parseInt(data.loanData.propertyValue).toLocaleString()}</li>
                            <li>LTV: ${data.loanData.ltv}</li>
                            <li>FICO Score: ${data.loanData.ficoScore}</li>
                            <li>Loan Type: ${data.loanData.loanType}</li>
                        </ul>
                    `;
                } else {
                    result.classList.add('error');
                    resultTitle.textContent = 'Error';
                    resultContent.innerHTML = `
                        <p>${data.error || 'An error occurred while calculating your rate.'}</p>
                        ${data.message ? `<p class="error-message">${data.message}</p>` : ''}
                        ${data.debug ? `<p class="error-message" style="margin-top: 10px; font-size: 12px; color: #666;">Debug info: ${JSON.stringify(data.debug)}</p>` : ''}
                    `;
                }
            } catch (error) {
                loading.classList.remove('active');
                submitBtn.disabled = false;
                testBtn.disabled = false;
                activeBtn.textContent = originalText;
                result.classList.add('error');
                resultTitle.textContent = 'Error';
                resultContent.innerHTML = `<p>Failed to connect to the server. Please try again later.</p>`;
                console.error('Error:', error);
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitForm(false);
        });
    </script>
</body>
</html>
```

---

## File: get-dropdowns.js

```javascript
const puppeteer = require('puppeteer');

async function getDropdowns() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  try {
    console.log('Loading page...');
    await page.goto('https://www.b-diya.nqxpricer.com/695e8559bfa826654b8fd62f', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    console.log('Waiting for form to load...');
    await page.waitForTimeout(10000); // Wait for React to render
    
    // Try multiple times to get dropdowns
    let dropdowns = [];
    for (let i = 0; i < 3; i++) {
      try {
        dropdowns = await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll('select'));
          if (selects.length === 0) return null;
          
          return selects.map(select => {
            const options = Array.from(select.options)
              .filter(opt => opt.value && opt.text.trim())
              .map(opt => ({
                value: opt.value,
                text: opt.text.trim()
              }));
            
            // Find label
            let label = '';
            const id = select.id || select.name;
            if (id) {
              const labelEl = document.querySelector(`label[for="${id}"]`);
              if (labelEl) label = labelEl.textContent.trim();
            }
            
            // Try parent
            if (!label) {
              const parent = select.closest('div, fieldset');
              const labelEl = parent?.querySelector('label, .label, [class*="label"]');
              if (labelEl) label = labelEl.textContent.trim();
            }
            
            return {
              id: select.id || '',
              name: select.name || '',
              label: label,
              options: options
            };
          });
        });
        
        if (dropdowns && dropdowns.length > 0) break;
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log(`Attempt ${i + 1} failed, retrying...`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (!dropdowns || dropdowns.length === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-form.png', fullPage: true });
      console.log('No dropdowns found. Screenshot saved to debug-form.png');
      console.log('Page HTML snippet:');
      const html = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
      console.log(html);
    } else {
      console.log('\n=== FOUND DROPDOWNS ===\n');
      console.log(JSON.stringify(dropdowns, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

getDropdowns().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## File: scrape-dropdowns.js

```javascript
const puppeteer = require('puppeteer');

async function scrapeDropdowns() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  const page = await browser.newPage();
  
  try {
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Ignore page errors (React errors are not critical)
    page.on('error', () => {});
    page.on('pageerror', () => {});
    
    await page.goto('https://www.b-diya.nqxpricer.com/695e8559bfa826654b8fd62f', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait for React to fully render
    await page.waitForTimeout(8000);
    
    // Wait for selects to appear
    await page.waitForSelector('select', { timeout: 10000 }).catch(() => {});

    // Extract all select dropdowns and their options
    const dropdowns = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map(select => {
        const options = Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text.trim()
        }));
        
        // Try to find label
        let label = '';
        if (select.id) {
          const labelEl = document.querySelector(`label[for="${select.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label && select.name) {
          const labelEl = document.querySelector(`label[for="${select.name}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        // Try to find nearby text
        if (!label) {
          const parent = select.closest('div, fieldset, form');
          if (parent) {
            const labelEl = parent.querySelector('label');
            if (labelEl) label = labelEl.textContent.trim();
          }
        }

        return {
          id: select.id || '',
          name: select.name || '',
          label: label,
          placeholder: select.getAttribute('placeholder') || '',
          options: options.filter(opt => opt.value !== '' || opt.text !== ''),
          className: select.className || ''
        };
      });
    });

    // Extract all input fields too
    const inputs = await page.evaluate(() => {
      const inputFields = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]'));
      return inputFields.map(input => {
        let label = '';
        if (input.id) {
          const labelEl = document.querySelector(`label[for="${input.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        return {
          id: input.id || '',
          name: input.name || '',
          type: input.type,
          placeholder: input.placeholder || '',
          label: label
        };
      });
    });

    console.log('\n=== DROPDOWNS (SELECTS) ===');
    console.log(JSON.stringify(dropdowns, null, 2));
    
    console.log('\n=== INPUT FIELDS ===');
    console.log(JSON.stringify(inputs, null, 2));

    // Take a screenshot
    await page.screenshot({ path: 'diya-form.png', fullPage: true });
    console.log('\nScreenshot saved to diya-form.png');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

scrapeDropdowns().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
```

---

## Project Structure

```
loan-pricer-white-label/
├── package.json
├── README.md
├── server-apify.js          (Main server - uses Apify for scraping)
├── server.js                (Alternative server - uses Playwright directly)
├── get-dropdowns.js         (Utility script to inspect dropdowns)
├── scrape-dropdowns.js      (Utility script to scrape form structure)
├── Images/
│   └── Sphinx Logo.jpeg     (Sphinx Capital logo)
└── public/
    └── index.html           (Frontend with Sphinx Capital branding)
```

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

3. Open browser to: `http://localhost:3000`

## Key Features

- ✅ Sphinx Capital branded UI with logo
- ✅ Optimized form filling with smart waits
- ✅ Handles eligible and ineligible loan scenarios
- ✅ Extracts interest rates from dynamic web pages
- ✅ Uses Apify for reliable cloud-based scraping
- ✅ Comprehensive error handling

---

**End of Documentation**
