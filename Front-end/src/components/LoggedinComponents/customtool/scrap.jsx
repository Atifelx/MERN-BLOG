
// import React, { useState, useRef } from 'react';
// import axios from 'axios';


// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;

// class URLContentMemory {
//     constructor() {
//         this.urlCache = new Map();
//         this.maxCacheSize = 30;
//         this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
//     }

//     store(url, data, metadata = {}) {
//         if (this.urlCache.size >= this.maxCacheSize) {
//             const firstKey = this.urlCache.keys().next().value;
//             this.urlCache.delete(firstKey);
//         }

//         const contentData = {
//             content: data,
//             metadata: {
//                 ...metadata,
//                 timestamp: Date.now(),
//                 size: new Blob([data]).size,
//                 url: url
//             }
//         };

//         this.urlCache.set(url, contentData);
//         return url;
//     }

//     get(url) {
//         return this.urlCache.get(url);
//     }

//     has(url) {
//         return this.urlCache.has(url);
//     }

//     clear() {
//         this.urlCache.clear();
//     }

//     getStats() {
//         let totalSize = 0;
//         this.urlCache.forEach(content => {
//             totalSize += content.metadata.size || 0;
//         });

//         return {
//             urlsCount: this.urlCache.size,
//             totalSize: totalSize,
//             totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
//         };
//     }
// }

// const Scrap = ({ onContentGenerated, apiBaseUrl }) => {
//     const [url, setUrl] = useState('');
//     const [scrapedContent, setScrapedContent] = useState('');
//     const [rewrittenContent, setRewrittenContent] = useState('');
//     const [scraping, setScraping] = useState(false);
//     const [rewriting, setRewriting] = useState(false);
//     const [scrapingProgress, setScrapingProgress] = useState(0);
//     const [rewritingProgress, setRewritingProgress] = useState(0);
//     const [urlStats, setUrlStats] = useState(null);
//     const [error, setError] = useState('');
//     const [currentStep, setCurrentStep] = useState('');
//     const [autoRewrite, setAutoRewrite] = useState(true);

//     // Memory system reference
//     const urlMemory = useRef(new URLContentMemory());

//     // Enhanced retry mechanism
//     const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//     // Multiple CORS proxy services as fallbacks
//     const proxyServices = [
//         {
//             name: 'AllOrigins',
//             url: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
//             extractContent: (response) => response.data?.contents
//         },
//         {
//             name: 'CORS Anywhere',
//             url: (targetUrl) => `https://cors-anywhere.herokuapp.com/${targetUrl}`,
//             extractContent: (response) => response.data,
//             headers: { 'X-Requested-With': 'XMLHttpRequest' }
//         },
//         {
//             name: 'ThingProxy',
//             url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'CORS.sh',
//             url: (targetUrl) => `https://cors.sh/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'Proxy6 CORS',
//             url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
//             extractContent: (response) => response.data
//         }
//     ];

//     // URL validation function
//     const isValidUrl = (string) => {
//         try {
//             const urlObj = new URL(string);
//             return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
//         } catch (_) {
//             return false;
//         }
//     };

//     // Clean and normalize URL
//     const normalizeUrl = (inputUrl) => {
//         let cleanUrl = inputUrl.trim();
//         if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
//             cleanUrl = 'https://' + cleanUrl;
//         }
//         return cleanUrl;
//     };

//     // Enhanced text extraction with better content detection
//     const extractTextFromHTML = (html) => {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');
            
//             // Remove unwanted elements
//             const unwantedSelectors = [
//                 'script', 'style', 'nav', 'footer', 'header', 'aside',
//                 '.advertisement', '.ads', '.social', '.comments',
//                 '.sidebar', '.menu', '.navigation', '.breadcrumb',
//                 '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
//             ];
            
//             unwantedSelectors.forEach(selector => {
//                 const elements = doc.querySelectorAll(selector);
//                 elements.forEach(element => element.remove());
//             });
            
//             // Priority content selectors (ordered by preference)
//             const contentSelectors = [
//                 'article',
//                 'main',
//                 '[role="main"]',
//                 '.content',
//                 '.post-content',
//                 '.entry-content',
//                 '.article-content',
//                 '.post',
//                 '.article',
//                 '#content',
//                 '.container',
//                 '.wrapper',
//                 'body'
//             ];
            
//             let extractedText = '';
//             let bestMatch = null;
//             let maxLength = 0;
            
//             // Find the selector with the most content
//             for (const selector of contentSelectors) {
//                 const elements = doc.querySelectorAll(selector);
//                 for (const element of elements) {
//                     const text = element.textContent || '';
//                     if (text.length > maxLength) {
//                         maxLength = text.length;
//                         bestMatch = text;
//                     }
//                 }
//                 if (bestMatch && maxLength > 500) break; // Stop if we found substantial content
//             }
            
//             extractedText = bestMatch || doc.body?.textContent || '';
            
//             // Enhanced text cleaning
//             const cleanedText = extractedText
//                 .replace(/\s+/g, ' ') // Replace multiple spaces with single space
//                 .replace(/\n\s*\n/g, '\n') // Remove empty lines
//                 .replace(/[\r\n\t]+/g, '\n') // Normalize line breaks
//                 .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
//                 .trim();
            
//             return cleanedText;
//         } catch (error) {
//             throw new Error(`HTML parsing failed: ${error.message}`);
//         }
//     };

//     // Enhanced fetch with multiple proxies and retry logic
//     const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
//         let lastError = null;
        
//         for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
//             const proxy = proxyServices[proxyIndex];
            
//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//                 try {
//                     setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);
                    
//                     const requestConfig = {
//                         timeout: 45000, // 45 second timeout
//                         headers: {
//                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                             'Accept-Language': 'en-US,en;q=0.5',
//                             'Accept-Encoding': 'gzip, deflate',
//                             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                             ...proxy.headers
//                         }
//                     };

//                     const response = await axios.get(proxy.url(targetUrl), requestConfig);
//                     const content = proxy.extractContent(response);
                    
//                     if (!content || content.length < 100) {
//                         throw new Error('Insufficient content received');
//                     }
                    
//                     return { data: content };
                    
//                 } catch (error) {
//                     lastError = error;
//                     const isLastAttempt = attempt === maxRetries;
//                     const isLastProxy = proxyIndex === proxyServices.length - 1;
                    
//                     if (!isLastAttempt || !isLastProxy) {
//                         const retryDelay = Math.min(2000 * attempt, 10000); // Exponential backoff, max 10s
//                         setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay/1000}s...`);
//                         await sleep(retryDelay);
//                     }
//                 }
//             }
//         }
        
//         // If all proxies failed, try direct fetch as last resort
//         try {
//             setCurrentStep('Trying direct fetch as last resort...');
//             const response = await axios.get(targetUrl, {
//                 timeout: 30000,
//                 headers: {
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//                 }
//             });
//             return { data: response.data };
//         } catch (directError) {
//             throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
//         }
//     };

//     // Enhanced scraping function with better error handling
//     const handleScrapeUrl = async () => {
//         if (!url.trim()) {
//             setError('Please enter a URL');
//             return;
//         }

//         const normalizedUrl = normalizeUrl(url);
        
//         if (!isValidUrl(normalizedUrl)) {
//             setError('Please enter a valid URL');
//             return;
//         }

//         setScraping(true);
//         setError('');
//         setScrapedContent('');
//         setRewrittenContent('');
//         setScrapingProgress(0);
//         setCurrentStep('Initializing enhanced scraper...');

//         try {
//             // Check cache first
//             if (urlMemory.current.has(normalizedUrl)) {
//                 setCurrentStep('Loading from cache...');
//                 setScrapingProgress(50);
//                 const cachedData = urlMemory.current.get(normalizedUrl);
//                 setScrapedContent(cachedData.content);
//                 setScrapingProgress(100);
//                 setCurrentStep('Content loaded from cache');
                
//                 if (autoRewrite && cachedData.content.trim()) {
//                     await handleRewriteContent(cachedData.content);
//                 }
//                 return;
//             }

//             setCurrentStep('Starting multi-proxy fetch...');
//             setScrapingProgress(10);

//             // Enhanced fetch with multiple strategies
//             const response = await fetchWithEnhancedProxy(normalizedUrl);
            
//             setCurrentStep('Analyzing and parsing content...');
//             setScrapingProgress(60);

//             // Wait a bit to ensure content is fully loaded
//             await sleep(1000);

//             // Extract text with enhanced parsing
//             const extractedText = extractTextFromHTML(response.data);
            
//             if (!extractedText.trim() || extractedText.length < 50) {
//                 throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
//             }

//             setCurrentStep('Processing and storing content...');
//             setScrapingProgress(80);

//             // Extract metadata
//             const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
//             const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';
            
//             const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

//             // Store in memory with enhanced metadata
//             urlMemory.current.store(normalizedUrl, extractedText, {
//                 title: title,
//                 scrapedAt: new Date().toISOString(),
//                 wordCount: wordCount,
//                 characterCount: extractedText.length,
//                 domain: new URL(normalizedUrl).hostname
//             });

//             setScrapedContent(extractedText);
//             setUrlStats(urlMemory.current.getStats());
//             setScrapingProgress(100);
//             setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

//             // Auto-rewrite if enabled
//             if (autoRewrite) {
//                 await sleep(1500); // Brief pause before rewriting
//                 await handleRewriteContent(extractedText);
//             }

//         } catch (error) {
//             console.error('Enhanced scraping error:', error);
//             setError(`Scraping failed: ${error.message}`);
//             setCurrentStep('');
            
//             // Additional error context
//             if (error.message.includes('timeout')) {
//                 setError(error.message + ' - The website might be slow or blocking requests.');
//             } else if (error.message.includes('Network Error')) {
//                 setError('Network error - Check your internet connection or try a different URL.');
//             }
//         } finally {
//             setScraping(false);
//             setTimeout(() => {
//                 setScrapingProgress(0);
//                 if (!error) setCurrentStep('');
//             }, 3000);
//         }
//     };


//     // Importing environment variables for API base URL
// //const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

//     // Enhanced rewrite function (unchanged core functionality)
//     const handleRewriteContent = async (content = scrapedContent) => {
//         if (!content?.trim()) {
//             setError('No content to rewrite');
//             return;
//         }

//         if (!apiBaseUrl) {
//             setError('API base URL not configured');
//             return;
//         }

//         setRewriting(true);
//         setRewritingProgress(0);
//         setError('');

//         try {
//             setRewritingProgress(25);
            
//             const rewritePrompt = `Transform the following scraped web content into 100% unique, humanized content that is completely undetectable by AI detection tools. 

// Requirements:
// - Make it sound natural and human-written
// - Maintain all important information and key points
// - Use varied sentence structures and natural language patterns
// - Add personal insights and conversational elements where appropriate
// - Ensure it's completely original and plagiarism-free
// - Keep the content informative and well-organized
// - Use proper formatting with headings and structure

// Original content to rewrite:
// ${content}

// Please rewrite this content to be engaging, unique, and indistinguishable from human-written content.`;




//             setRewritingProgress(50);

//             const response = await axios.post(

//                 `${apiBaseUrl}/rewrite`,
//                 {
//                     input: rewritePrompt,
//                     action: "Write a humanized, 100% unique content that is undetectable by AI"
//                 },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                     timeout: 60000 // 60 second timeout
//                 }
//             );

//             setRewritingProgress(90);

//             if (response.data && response.data.modifiedText) {
//                 setRewrittenContent(response.data.modifiedText);
                
//                 // Trigger callback if provided
//                 if (onContentGenerated) {
//                     onContentGenerated({
//                         originalUrl: url,
//                         scrapedContent: content,
//                         rewrittenContent: response.data.modifiedText,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             } else {
//                 throw new Error('No rewritten content received from API');
//             }

//             setRewritingProgress(100);

//         } catch (error) {
//             console.error('Rewriting error:', error);
//             setError(`Rewriting failed: ${error.message}`);
//         } finally {
//             setRewriting(false);
//             setTimeout(() => setRewritingProgress(0), 3000);
//         }
//     };

//     // Clear all cached content
//     const clearCache = () => {
//         urlMemory.current.clear();
//         setScrapedContent('');
//         setRewrittenContent('');
//         setUrlStats(null);
//         setError('');
//     };

//     // Copy content to clipboard
//     const copyToClipboard = async (content) => {
//         try {
//             await navigator.clipboard.writeText(content);
//             // You might want to show a toast notification here
//         } catch (error) {
//             console.error('Failed to copy to clipboard:', error);
//         }
//     };

//     return (
//         <div className="w-full space-y-6 m-5">
//             {/* Enhanced Cache Stats */}
//             {urlStats && (
//                 <div className="p-3 bg-green-50 rounded-lg border border-green-200">
//                     <div className="flex justify-between items-center">
//                         <div className="text-sm text-green-700">
//                             <span className="font-medium">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
//                         </div>
//                         <button
//                             onClick={clearCache}
//                             className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
//                         >
//                             Clear Cache
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* URL Input Section */}
//             <div className="space-y-4">
//                 <div>
//                     <label htmlFor="url-input" className="block mb-2 text-sm font-medium text-gray-700">
//                         Website URL (Enhanced Multi-Proxy Scraper)
//                     </label>
//                     <div className="flex gap-2">
//                         <input
//                             type="text"
//                             id="url-input"
//                             value={url}
//                             onChange={(e) => setUrl(e.target.value)}
//                             placeholder="https://example.com/article"
//                             className="flex-1 bg-gray-200 border-none text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
//                             onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
//                         />
//                         <button
//                             onClick={handleScrapeUrl}
//                             disabled={scraping || !url.trim()}
//                             className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
//                         >
//                             {scraping ? 'Scraping...' : 'Enhanced Scrape'}
//                         </button>
//                     </div>
//                     <p className="text-xs text-gray-500 mt-1">
//                         🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
//                     </p>
//                 </div>

//                 {/* Auto-rewrite toggle */}
//                 <div className="flex items-center">
//                     <input
//                         type="checkbox"
//                         id="auto-rewrite"
//                         checked={autoRewrite}
//                         onChange={(e) => setAutoRewrite(e.target.checked)}
//                         className="mr-2"
//                     />
//                     <label htmlFor="auto-rewrite" className="text-sm text-gray-700">
//                         Automatically rewrite content after scraping
//                     </label>
//                 </div>
//             </div>

//             {/* Enhanced Progress Indicators */}
//             {(scraping || scrapingProgress > 0) && (
//                 <div className="space-y-2">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm text-blue-600">Enhanced Scraping Progress</span>
//                         <span className="text-sm text-blue-600">{scrapingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-3">
//                         <div 
//                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
//                             style={{ width: `${scrapingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <p className="text-xs text-blue-600 font-medium">{currentStep}</p>
//                     )}
//                 </div>
//             )}

//             {(rewriting || rewritingProgress > 0) && (
//                 <div className="space-y-2">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm text-green-600">Rewriting Progress</span>
//                         <span className="text-sm text-green-600">{rewritingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-3">
//                         <div 
//                             className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
//                             style={{ width: `${rewritingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <div className="p-3 bg-red-50 rounded-lg border border-red-200">
//                     <div className="flex items-center">
//                         <span className="text-red-500 mr-2">⚠️</span>
//                         <span className="text-sm text-red-700">{error}</span>
//                     </div>
//                 </div>
//             )}

//             {/* Scraped Content Display */}
//             {scrapedContent && (
//                 <div className="space-y-3 m-2">
//                     <div className="flex justify-between items-center">
//                         <h3 className="text-lg font-medium text-gray-700">
//                             Scraped Content 
//                             <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
//                                 Enhanced Extraction
//                             </span>
//                         </h3>
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => copyToClipboard(scrapedContent)}
//                                 className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
//                             >
//                                 Copy
//                             </button>
//                             {!autoRewrite && (
//                                 <button
//                                     onClick={() => handleRewriteContent()}
//                                     disabled={rewriting}
//                                     className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
//                                 >
//                                     {rewriting ? 'Rewriting...' : 'Rewrite'}
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                     <div className="max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap">
//                             {scrapedContent.length > 1000 
//                                 ? `${scrapedContent.substring(0, 1000)}...` 
//                                 : scrapedContent
//                             }
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500">
//                         {scrapedContent.split(' ').length.toLocaleString()} words, {scrapedContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Rewritten Content Display */}
//             {rewrittenContent && (
//                 <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                         <h3 className="text-lg font-medium text-gray-700">
//                             Rewritten Content 
//                             <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
//                                 100% Unique & Humanized
//                             </span>
//                         </h3>
//                         <button
//                             onClick={() => copyToClipboard(rewrittenContent)}
//                             className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
//                         >
//                             Copy
//                         </button>
//                     </div>
//                     <div className="max-h-96 overflow-y-auto bg-white p-4 rounded-lg border border-green-200">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap">
//                             {rewrittenContent}
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500">
//                         {rewrittenContent.split(' ').length.toLocaleString()} words, {rewrittenContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Real-time Status Display */}
//             {(scraping || rewriting) && (
//                 <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
//                     <div className="flex items-center">
//                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
//                         <div className="text-sm">
//                             {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
//                             {rewriting && <span className="text-green-600">Creating unique content...</span>}
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <div className="text-xs text-gray-500 mt-1">{currentStep}</div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Scrap;

//------------------------------------------------------------------------------------------------------------------------










// import React, { useState, useRef } from 'react';
// import axios from 'axios';

// class URLContentMemory {
//     constructor() {
//         this.urlCache = new Map();
//         this.maxCacheSize = 30;
//         this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
//     }

//     store(url, data, metadata = {}) {
//         if (this.urlCache.size >= this.maxCacheSize) {
//             const firstKey = this.urlCache.keys().next().value;
//             this.urlCache.delete(firstKey);
//         }

//         const contentData = {
//             content: data,
//             metadata: {
//                 ...metadata,
//                 timestamp: Date.now(),
//                 size: new Blob([data]).size,
//                 url: url
//             }
//         };

//         this.urlCache.set(url, contentData);
//         return url;
//     }

//     get(url) {
//         return this.urlCache.get(url);
//     }

//     has(url) {
//         return this.urlCache.has(url);
//     }

//     clear() {
//         this.urlCache.clear();
//     }

//     getStats() {
//         let totalSize = 0;
//         this.urlCache.forEach(content => {
//             totalSize += content.metadata.size || 0;
//         });

//         return {
//             urlsCount: this.urlCache.size,
//             totalSize: totalSize,
//             totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
//         };
//     }
// }

// const Scrap = ({ onContentGenerated }) => {
//     // GET API BASE URL FROM ENVIRONMENT VARIABLES - MOVED TO TOP OF COMPONENT
//     const getApiBaseUrl = () => {
//         // Try different environment variable patterns
//         if (typeof import.meta !== 'undefined' && import.meta.env) {
//             return import.meta.env.VITE_API_BASE_URL;
//         }
//         if (typeof process !== 'undefined' && process.env) {
//             return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
//         }
//         return null;
//     };

//     const apiBaseUrl = getApiBaseUrl();

//     // Debug logging - remove after fixing
//     console.log('🔍 Environment Debug:', {
//         apiBaseUrl: apiBaseUrl,
//         viteEnv: typeof import.meta !== 'undefined' ? import.meta.env : 'Not available',
//         processEnv: typeof process !== 'undefined' && process.env ? 'Available' : 'Not available',
//         allViteKeys: typeof import.meta !== 'undefined' && import.meta.env ? Object.keys(import.meta.env) : [],
//         reactAppKeys: typeof process !== 'undefined' && process.env ? Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')) : []
//     });

//     const [url, setUrl] = useState('');
//     const [scrapedContent, setScrapedContent] = useState('');
//     const [rewrittenContent, setRewrittenContent] = useState('');
//     const [scraping, setScraping] = useState(false);
//     const [rewriting, setRewriting] = useState(false);
//     const [scrapingProgress, setScrapingProgress] = useState(0);
//     const [rewritingProgress, setRewritingProgress] = useState(0);
//     const [urlStats, setUrlStats] = useState(null);
//     const [error, setError] = useState('');
//     const [currentStep, setCurrentStep] = useState('');
//     const [autoRewrite, setAutoRewrite] = useState(true);

//     // Memory system reference
//     const urlMemory = useRef(new URLContentMemory());

//     // Enhanced retry mechanism
//     const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//     // Multiple CORS proxy services as fallbacks
//     const proxyServices = [
//         {
//             name: 'AllOrigins',
//             url: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
//             extractContent: (response) => response.data?.contents
//         },
//         {
//             name: 'CORS Anywhere',
//             url: (targetUrl) => `https://cors-anywhere.herokuapp.com/${targetUrl}`,
//             extractContent: (response) => response.data,
//             headers: { 'X-Requested-With': 'XMLHttpRequest' }
//         },
//         {
//             name: 'ThingProxy',
//             url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'CORS.sh',
//             url: (targetUrl) => `https://cors.sh/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'Proxy6 CORS',
//             url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
//             extractContent: (response) => response.data
//         }
//     ];

//     // URL validation function
//     const isValidUrl = (string) => {
//         try {
//             const urlObj = new URL(string);
//             return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
//         } catch (_) {
//             return false;
//         }
//     };

//     // Clean and normalize URL
//     const normalizeUrl = (inputUrl) => {
//         let cleanUrl = inputUrl.trim();
//         if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
//             cleanUrl = 'https://' + cleanUrl;
//         }
//         return cleanUrl;
//     };

//     // Enhanced text extraction with better content detection
//     const extractTextFromHTML = (html) => {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');
            
//             // Remove unwanted elements
//             const unwantedSelectors = [
//                 'script', 'style', 'nav', 'footer', 'header', 'aside',
//                 '.advertisement', '.ads', '.social', '.comments',
//                 '.sidebar', '.menu', '.navigation', '.breadcrumb',
//                 '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
//             ];
            
//             unwantedSelectors.forEach(selector => {
//                 const elements = doc.querySelectorAll(selector);
//                 elements.forEach(element => element.remove());
//             });
            
//             // Priority content selectors (ordered by preference)
//             const contentSelectors = [
//                 'article',
//                 'main',
//                 '[role="main"]',
//                 '.content',
//                 '.post-content',
//                 '.entry-content',
//                 '.article-content',
//                 '.post',
//                 '.article',
//                 '#content',
//                 '.container',
//                 '.wrapper',
//                 'body'
//             ];
            
//             let extractedText = '';
//             let bestMatch = null;
//             let maxLength = 0;
            
//             // Find the selector with the most content
//             for (const selector of contentSelectors) {
//                 const elements = doc.querySelectorAll(selector);
//                 for (const element of elements) {
//                     const text = element.textContent || '';
//                     if (text.length > maxLength) {
//                         maxLength = text.length;
//                         bestMatch = text;
//                     }
//                 }
//                 if (bestMatch && maxLength > 500) break; // Stop if we found substantial content
//             }
            
//             extractedText = bestMatch || doc.body?.textContent || '';
            
//             // Enhanced text cleaning
//             const cleanedText = extractedText
//                 .replace(/\s+/g, ' ') // Replace multiple spaces with single space
//                 .replace(/\n\s*\n/g, '\n') // Remove empty lines
//                 .replace(/[\r\n\t]+/g, '\n') // Normalize line breaks
//                 .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
//                 .trim();
            
//             return cleanedText;
//         } catch (error) {
//             throw new Error(`HTML parsing failed: ${error.message}`);
//         }
//     };

//     // Enhanced fetch with multiple proxies and retry logic
//     const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
//         let lastError = null;
        
//         for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
//             const proxy = proxyServices[proxyIndex];
            
//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//                 try {
//                     setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);
                    
//                     const requestConfig = {
//                         timeout: 45000, // 45 second timeout
//                         headers: {
//                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                             'Accept-Language': 'en-US,en;q=0.5',
//                             'Accept-Encoding': 'gzip, deflate',
//                             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                             ...proxy.headers
//                         }
//                     };

//                     const response = await axios.get(proxy.url(targetUrl), requestConfig);
//                     const content = proxy.extractContent(response);
                    
//                     if (!content || content.length < 100) {
//                         throw new Error('Insufficient content received');
//                     }
                    
//                     return { data: content };
                    
//                 } catch (error) {
//                     lastError = error;
//                     const isLastAttempt = attempt === maxRetries;
//                     const isLastProxy = proxyIndex === proxyServices.length - 1;
                    
//                     if (!isLastAttempt || !isLastProxy) {
//                         const retryDelay = Math.min(2000 * attempt, 10000); // Exponential backoff, max 10s
//                         setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay/1000}s...`);
//                         await sleep(retryDelay);
//                     }
//                 }
//             }
//         }
        
//         // If all proxies failed, try direct fetch as last resort
//         try {
//             setCurrentStep('Trying direct fetch as last resort...');
//             const response = await axios.get(targetUrl, {
//                 timeout: 30000,
//                 headers: {
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//                 }
//             });
//             return { data: response.data };
//         } catch (directError) {
//             throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
//         }
//     };

//     // Enhanced scraping function with better error handling
//     const handleScrapeUrl = async () => {
//         if (!url.trim()) {
//             setError('Please enter a URL');
//             return;
//         }

//         const normalizedUrl = normalizeUrl(url);
        
//         if (!isValidUrl(normalizedUrl)) {
//             setError('Please enter a valid URL');
//             return;
//         }

//         setScraping(true);
//         setError('');
//         setScrapedContent('');
//         setRewrittenContent('');
//         setScrapingProgress(0);
//         setCurrentStep('Initializing enhanced scraper...');

//         try {
//             // Check cache first
//             if (urlMemory.current.has(normalizedUrl)) {
//                 setCurrentStep('Loading from cache...');
//                 setScrapingProgress(50);
//                 const cachedData = urlMemory.current.get(normalizedUrl);
//                 setScrapedContent(cachedData.content);
//                 setScrapingProgress(100);
//                 setCurrentStep('Content loaded from cache');
                
//                 if (autoRewrite && cachedData.content.trim()) {
//                     await handleRewriteContent(cachedData.content);
//                 }
//                 return;
//             }

//             setCurrentStep('Starting multi-proxy fetch...');
//             setScrapingProgress(10);

//             // Enhanced fetch with multiple strategies
//             const response = await fetchWithEnhancedProxy(normalizedUrl);
            
//             setCurrentStep('Analyzing and parsing content...');
//             setScrapingProgress(60);

//             // Wait a bit to ensure content is fully loaded
//             await sleep(1000);

//             // Extract text with enhanced parsing
//             const extractedText = extractTextFromHTML(response.data);
            
//             if (!extractedText.trim() || extractedText.length < 50) {
//                 throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
//             }

//             setCurrentStep('Processing and storing content...');
//             setScrapingProgress(80);

//             // Extract metadata
//             const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
//             const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';
            
//             const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

//             // Store in memory with enhanced metadata
//             urlMemory.current.store(normalizedUrl, extractedText, {
//                 title: title,
//                 scrapedAt: new Date().toISOString(),
//                 wordCount: wordCount,
//                 characterCount: extractedText.length,
//                 domain: new URL(normalizedUrl).hostname
//             });

//             setScrapedContent(extractedText);
//             setUrlStats(urlMemory.current.getStats());
//             setScrapingProgress(100);
//             setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

//             // Auto-rewrite if enabled
//             if (autoRewrite) {
//                 await sleep(1500); // Brief pause before rewriting
//                 await handleRewriteContent(extractedText);
//             }

//         } catch (error) {
//             console.error('Enhanced scraping error:', error);
//             setError(`Scraping failed: ${error.message}`);
//             setCurrentStep('');
            
//             // Additional error context
//             if (error.message.includes('timeout')) {
//                 setError(error.message + ' - The website might be slow or blocking requests.');
//             } else if (error.message.includes('Network Error')) {
//                 setError('Network error - Check your internet connection or try a different URL.');
//             }
//         } finally {
//             setScraping(false);
//             setTimeout(() => {
//                 setScrapingProgress(0);
//                 if (!error) setCurrentStep('');
//             }, 3000);
//         }
//     };

//     // Enhanced rewrite function with proper apiBaseUrl usage
//     const handleRewriteContent = async (content = scrapedContent) => {
//         if (!content?.trim()) {
//             setError('No content to rewrite');
//             return;
//         }

//         // CHECK API BASE URL HERE - THIS IS WHERE IT'S ACTUALLY USED
//         console.log('🔧 Checking API Base URL:', apiBaseUrl);
        
//         if (!apiBaseUrl) {
//             setError(`API base URL not configured. Please check your environment variables. 
//                      Expected: VITE_API_BASE_URL, REACT_APP_API_BASE_URL, or NEXT_PUBLIC_API_BASE_URL`);
//             return;
//         }

//         setRewriting(true);
//         setRewritingProgress(0);
//         setError('');

//         try {
//             setRewritingProgress(25);
            
//             const rewritePrompt = `Transform the following scraped web content into 100% unique, humanized content that is completely undetectable by AI detection tools. 

// Requirements:
// - Make it sound natural and human-written
// - Maintain all important information and key points
// - Use varied sentence structures and natural language patterns
// - Add personal insights and conversational elements where appropriate
// - Ensure it's completely original and plagiarism-free
// - Keep the content informative and well-organized
// - Use proper formatting with headings and structure

// Original content to rewrite:
// ${content}

// Please rewrite this content to be engaging, unique, and indistinguishable from human-written content.`;

//             setRewritingProgress(50);

//             console.log('🚀 Making API request to:', `${apiBaseUrl}/rewrite`);

//             const response = await axios.post(
//                 `${apiBaseUrl}/rewrite`,
//                 {
//                     input: rewritePrompt,
//                     action: "Write a humanized, 100% unique content that is undetectable by AI"
//                 },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                     timeout: 60000 // 60 second timeout
//                 }
//             );

//             setRewritingProgress(90);

//             if (response.data && response.data.modifiedText) {
//                 setRewrittenContent(response.data.modifiedText);
                
//                 // Trigger callback if provided
//                 if (onContentGenerated) {
//                     onContentGenerated({
//                         originalUrl: url,
//                         scrapedContent: content,
//                         rewrittenContent: response.data.modifiedText,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             } else {
//                 throw new Error('No rewritten content received from API');
//             }

//             setRewritingProgress(100);

//         } catch (error) {
//             console.error('Rewriting error:', error);
//             if (error.message.includes('Network Error') || error.message.includes('connect')) {
//                 setError(`Cannot connect to API server at ${apiBaseUrl}. Please check if the server is running.`);
//             } else {
//                 setError(`Rewriting failed: ${error.message}`);
//             }
//         } finally {
//             setRewriting(false);
//             setTimeout(() => setRewritingProgress(0), 3000);
//         }
//     };

//     // Clear all cached content
//     const clearCache = () => {
//         urlMemory.current.clear();
//         setScrapedContent('');
//         setRewrittenContent('');
//         setUrlStats(null);
//         setError('');
//     };

//     // Copy content to clipboard
//     const copyToClipboard = async (content) => {
//         try {
//             await navigator.clipboard.writeText(content);
//             // You might want to show a toast notification here
//         } catch (error) {
//             console.error('Failed to copy to clipboard:', error);
//         }
//     };

//     return (
//         <div className="w-full space-y-6 m-5">
//             {/* API Status Display */}
//             {/* <div className={`p-3 rounded-lg border ${apiBaseUrl ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
//                 <div className="text-sm">
//                     <span className="font-medium">API Status:</span> {apiBaseUrl ? `✅ ${apiBaseUrl}` : '❌ Not configured'}
//                 </div>
//             </div> */}

//             {/* Enhanced Cache Stats */}
//             {urlStats && (
//                 <div className="p-3 bg-green-50 rounded-lg border border-green-200">
//                     <div className="flex justify-between items-center">
//                         <div className="text-sm text-green-700">
//                             <span className="font-medium">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
//                         </div>
//                         <button
//                             onClick={clearCache}
//                             className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
//                         >
//                             Clear Cache
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* URL Input Section */}
//             <div className="space-y-4">
//                 <div>
//                     <label htmlFor="url-input" className="block mb-2 text-sm font-medium text-gray-700">
//                         Website URL (Enhanced Multi-Proxy Scraper)
//                     </label>
//                     <div className="flex gap-2">
//                         <input
//                             type="text"
//                             id="url-input"
//                             value={url}
//                             onChange={(e) => setUrl(e.target.value)}
//                             placeholder="https://example.com/article"
//                             className="flex-1 bg-gray-200 border-none text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
//                             onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
//                         />
//                         <button
//                             onClick={handleScrapeUrl}
//                             disabled={scraping || !url.trim()}
//                             className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
//                         >
//                             {scraping ? 'Scraping...' : 'Enhanced Scrape'}
//                         </button>
//                     </div>
//                     <p className="text-xs text-gray-500 mt-1">
//                         🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
//                     </p>
//                 </div>

//                 {/* Auto-rewrite toggle */}
//                 <div className="flex items-center">
//                     <input
//                         type="checkbox"
//                         id="auto-rewrite"
//                         checked={autoRewrite}
//                         onChange={(e) => setAutoRewrite(e.target.checked)}
//                         className="mr-2"
//                     />
//                     <label htmlFor="auto-rewrite" className="text-sm text-gray-700">
//                         Automatically rewrite content after scraping
//                     </label>
//                 </div>
//             </div>

//             {/* Enhanced Progress Indicators */}
//             {(scraping || scrapingProgress > 0) && (
//                 <div className="space-y-2">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm text-blue-600">Enhanced Scraping Progress</span>
//                         <span className="text-sm text-blue-600">{scrapingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-3">
//                         <div 
//                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
//                             style={{ width: `${scrapingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <p className="text-xs text-blue-600 font-medium">{currentStep}</p>
//                     )}
//                 </div>
//             )}

//             {(rewriting || rewritingProgress > 0) && (
//                 <div className="space-y-2">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm text-green-600">Rewriting Progress</span>
//                         <span className="text-sm text-green-600">{rewritingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-3">
//                         <div 
//                             className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
//                             style={{ width: `${rewritingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <div className="p-3 bg-red-50 rounded-lg border border-red-200">
//                     <div className="flex items-center">
//                         <span className="text-red-500 mr-2">⚠️</span>
//                         <span className="text-sm text-red-700">{error}</span>
//                     </div>
//                 </div>
//             )}

//             {/* Scraped Content Display */}
//             {scrapedContent && (
//                 <div className="space-y-3 m-2">
//                     <div className="flex justify-between items-center">
//                         <h3 className="text-lg font-medium text-gray-700">
//                             Scraped Content 
//                             <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
//                                 Enhanced Extraction
//                             </span>
//                         </h3>
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => copyToClipboard(scrapedContent)}
//                                 className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
//                             >
//                                 Copy
//                             </button>
//                             {!autoRewrite && (
//                                 <button
//                                     onClick={() => handleRewriteContent()}
//                                     disabled={rewriting}
//                                     className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
//                                 >
//                                     {rewriting ? 'Rewriting...' : 'Rewrite'}
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                     <div className="max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap">
//                             {scrapedContent.length > 1000 
//                                 ? `${scrapedContent.substring(0, 1000)}...` 
//                                 : scrapedContent
//                             }
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500">
//                         {scrapedContent.split(' ').length.toLocaleString()} words, {scrapedContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Rewritten Content Display */}
//             {rewrittenContent && (
//                 <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                         <h3 className="text-lg font-medium text-gray-700">
//                             Rewritten Content 
//                             <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
//                                 100% Unique & Humanized
//                             </span>
//                         </h3>
//                         <button
//                             onClick={() => copyToClipboard(rewrittenContent)}
//                             className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
//                         >
//                             Copy
//                         </button>
//                     </div>
//                     <div className="max-h-96 overflow-y-auto bg-white p-4 rounded-lg border border-green-200">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap">
//                             {rewrittenContent}
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500">
//                         {rewrittenContent.split(' ').length.toLocaleString()} words, {rewrittenContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Real-time Status Display */}
//             {(scraping || rewriting) && (
//                 <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
//                     <div className="flex items-center">
//                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
//                         <div className="text-sm">
//                             {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
//                             {rewriting && <span className="text-green-600">Creating unique content...</span>}
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <div className="text-xs text-gray-500 mt-1">{currentStep}</div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Scrap;











// import React, { useState, useRef } from 'react';
// import axios from 'axios';

// class URLContentMemory {
//     constructor() {
//         this.urlCache = new Map();
//         this.maxCacheSize = 30;
//         this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
//     }

//     store(url, data, metadata = {}) {
//         if (this.urlCache.size >= this.maxCacheSize) {
//             const firstKey = this.urlCache.keys().next().value;
//             this.urlCache.delete(firstKey);
//         }

//         const contentData = {
//             content: data,
//             metadata: {
//                 ...metadata,
//                 timestamp: Date.now(),
//                 size: new Blob([data]).size,
//                 url: url
//             }
//         };

//         this.urlCache.set(url, contentData);
//         return url;
//     }

//     get(url) {
//         return this.urlCache.get(url);
//     }

//     has(url) {
//         return this.urlCache.has(url);
//     }

//     clear() {
//         this.urlCache.clear();
//     }

//     getStats() {
//         let totalSize = 0;
//         this.urlCache.forEach(content => {
//             totalSize += content.metadata.size || 0;
//         });

//         return {
//             urlsCount: this.urlCache.size,
//             totalSize: totalSize,
//             totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
//         };
//     }
// }

// const Scrap = ({ onContentGenerated }) => {
//     // GET API BASE URL FROM ENVIRONMENT VARIABLES - MOVED TO TOP OF COMPONENT
//     const getApiBaseUrl = () => {
//         // Try different environment variable patterns
//         if (typeof import.meta !== 'undefined' && import.meta.env) {
//             return import.meta.env.VITE_API_BASE_URL;
//         }
//         if (typeof process !== 'undefined' && process.env) {
//             return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
//         }
//         return null;
//     };

//     const apiBaseUrl = getApiBaseUrl();

//     // Debug logging - remove after fixing
//     console.log('🔍 Environment Debug:', {
//         apiBaseUrl: apiBaseUrl,
//         viteEnv: typeof import.meta !== 'undefined' ? import.meta.env : 'Not available',
//         processEnv: typeof process !== 'undefined' && process.env ? 'Available' : 'Not available',
//         allViteKeys: typeof import.meta !== 'undefined' && import.meta.env ? Object.keys(import.meta.env) : [],
//         reactAppKeys: typeof process !== 'undefined' && process.env ? Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')) : []
//     });

//     const [url, setUrl] = useState('');
//     const [scrapedContent, setScrapedContent] = useState('');
//     const [rewrittenContent, setRewrittenContent] = useState('');
//     const [scraping, setScraping] = useState(false);
//     const [rewriting, setRewriting] = useState(false);
//     const [scrapingProgress, setScrapingProgress] = useState(0);
//     const [rewritingProgress, setRewritingProgress] = useState(0);
//     const [urlStats, setUrlStats] = useState(null);
//     const [error, setError] = useState('');
//     const [currentStep, setCurrentStep] = useState('');
//     const [autoRewrite, setAutoRewrite] = useState(true);

//     // Memory system reference
//     const urlMemory = useRef(new URLContentMemory());

//     // Enhanced retry mechanism
//     const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//     // Multiple CORS proxy services as fallbacks
//     const proxyServices = [

   
//         {
//             name: 'ThingProxy',
//             url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'CORS.sh',
//             url: (targetUrl) => `https://cors.sh/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'Proxy6 CORS',
//             url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
//             extractContent: (response) => response.data
//         }
//     ];

//     // URL validation function
//     const isValidUrl = (string) => {
//         try {
//             const urlObj = new URL(string);
//             return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
//         } catch (_) {
//             return false;
//         }
//     };

//     // Clean and normalize URL
//     const normalizeUrl = (inputUrl) => {
//         let cleanUrl = inputUrl.trim();
//         if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
//             cleanUrl = 'https://' + cleanUrl;
//         }
//         return cleanUrl;
//     };

//     // Enhanced text extraction with better content detection
//     const extractTextFromHTML = (html) => {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');
            
//             // Remove unwanted elements
//             const unwantedSelectors = [
//                 'script', 'style', 'nav', 'footer', 'header', 'aside',
//                 '.advertisement', '.ads', '.social', '.comments',
//                 '.sidebar', '.menu', '.navigation', '.breadcrumb',
//                 '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
//             ];
            
//             unwantedSelectors.forEach(selector => {
//                 const elements = doc.querySelectorAll(selector);
//                 elements.forEach(element => element.remove());
//             });
            
//             // Priority content selectors (ordered by preference)
//             const contentSelectors = [
//                 'article',
//                 'main',
//                 '[role="main"]',
//                 '.content',
//                 '.post-content',
//                 '.entry-content',
//                 '.article-content',
//                 '.post',
//                 '.article',
//                 '#content',
//                 '.container',
//                 '.wrapper',
//                 'body'
//             ];
            
//             let extractedText = '';
//             let bestMatch = null;
//             let maxLength = 0;
            
//             // Find the selector with the most content
//             for (const selector of contentSelectors) {
//                 const elements = doc.querySelectorAll(selector);
//                 for (const element of elements) {
//                     const text = element.textContent || '';
//                     if (text.length > maxLength) {
//                         maxLength = text.length;
//                         bestMatch = text;
//                     }
//                 }
//                 if (bestMatch && maxLength > 500) break; // Stop if we found substantial content
//             }
            
//             extractedText = bestMatch || doc.body?.textContent || '';
            
//             // Enhanced text cleaning
//             const cleanedText = extractedText
//                 .replace(/\s+/g, ' ') // Replace multiple spaces with single space
//                 .replace(/\n\s*\n/g, '\n') // Remove empty lines
//                 .replace(/[\r\n\t]+/g, '\n') // Normalize line breaks
//                 .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
//                 .trim();
            
//             return cleanedText;
//         } catch (error) {
//             throw new Error(`HTML parsing failed: ${error.message}`);
//         }
//     };

//     // Enhanced fetch with multiple proxies and retry logic
//     const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
//         let lastError = null;
        
//         for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
//             const proxy = proxyServices[proxyIndex];
            
//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//                 try {
//                     setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);
                    
//                     const requestConfig = {
//                         timeout: 45000, // 45 second timeout
//                         headers: {
//                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                             'Accept-Language': 'en-US,en;q=0.5',
//                             'Accept-Encoding': 'gzip, deflate',
//                             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                             ...proxy.headers
//                         }
//                     };

//                     const response = await axios.get(proxy.url(targetUrl), requestConfig);
//                     const content = proxy.extractContent(response);
                    
//                     if (!content || content.length < 100) {
//                         throw new Error('Insufficient content received');
//                     }
                    
//                     return { data: content };
                    
//                 } catch (error) {
//                     lastError = error;
//                     const isLastAttempt = attempt === maxRetries;
//                     const isLastProxy = proxyIndex === proxyServices.length - 1;
                    
//                     if (!isLastAttempt || !isLastProxy) {
//                         const retryDelay = Math.min(2000 * attempt, 10000); // Exponential backoff, max 10s
//                         setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay/1000}s...`);
//                         await sleep(retryDelay);
//                     }
//                 }
//             }
//         }
        
//         // If all proxies failed, try direct fetch as last resort
//         try {
//             setCurrentStep('Trying direct fetch as last resort...');
//             const response = await axios.get(targetUrl, {
//                 timeout: 30000,
//                 headers: {
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//                 }
//             });
//             return { data: response.data };
//         } catch (directError) {
//             throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
//         }
//     };

//     // Enhanced scraping function with better error handling
//     const handleScrapeUrl = async () => {
//         if (!url.trim()) {
//             setError('Please enter a URL');
//             return;
//         }

//         const normalizedUrl = normalizeUrl(url);
        
//         if (!isValidUrl(normalizedUrl)) {
//             setError('Please enter a valid URL');
//             return;
//         }

//         setScraping(true);
//         setError('');
//         setScrapedContent('');
//         setRewrittenContent('');
//         setScrapingProgress(0);
//         setCurrentStep('Initializing enhanced scraper...');

//         try {
//             // Check cache first
//             if (urlMemory.current.has(normalizedUrl)) {
//                 setCurrentStep('Loading from cache...');
//                 setScrapingProgress(50);
//                 const cachedData = urlMemory.current.get(normalizedUrl);
//                 setScrapedContent(cachedData.content);
//                 setScrapingProgress(100);
//                 setCurrentStep('Content loaded from cache');
                
//                 if (autoRewrite && cachedData.content.trim()) {
//                     await handleRewriteContent(cachedData.content);
//                 }
//                 return;
//             }

//             setCurrentStep('Starting multi-proxy fetch...');
//             setScrapingProgress(10);

//             // Enhanced fetch with multiple strategies
//             const response = await fetchWithEnhancedProxy(normalizedUrl);
            
//             setCurrentStep('Analyzing and parsing content...');
//             setScrapingProgress(60);

//             // Wait a bit to ensure content is fully loaded
//             await sleep(1000);

//             // Extract text with enhanced parsing
//             const extractedText = extractTextFromHTML(response.data);
            
//             if (!extractedText.trim() || extractedText.length < 50) {
//                 throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
//             }

//             setCurrentStep('Processing and storing content...');
//             setScrapingProgress(80);

//             // Extract metadata
//             const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
//             const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';
            
//             const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

//             // Store in memory with enhanced metadata
//             urlMemory.current.store(normalizedUrl, extractedText, {
//                 title: title,
//                 scrapedAt: new Date().toISOString(),
//                 wordCount: wordCount,
//                 characterCount: extractedText.length,
//                 domain: new URL(normalizedUrl).hostname
//             });

//             setScrapedContent(extractedText);
//             setUrlStats(urlMemory.current.getStats());
//             setScrapingProgress(100);
//             setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

//             // Auto-rewrite if enabled
//             if (autoRewrite) {
//                 await sleep(1500); // Brief pause before rewriting
//                 await handleRewriteContent(extractedText);
//             }

//         } catch (error) {
//             console.error('Enhanced scraping error:', error);
//             setError(`Scraping failed: ${error.message}`);
//             setCurrentStep('');
            
//             // Additional error context
//             if (error.message.includes('timeout')) {
//                 setError(error.message + ' - The website might be slow or blocking requests.');
//             } else if (error.message.includes('Network Error')) {
//                 setError('Network error - Check your internet connection or try a different URL.');
//             }
//         } finally {
//             setScraping(false);
//             setTimeout(() => {
//                 setScrapingProgress(0);
//                 if (!error) setCurrentStep('');
//             }, 3000);
//         }
//     };

//     // Enhanced rewrite function with proper apiBaseUrl usage
//     const handleRewriteContent = async (content = scrapedContent) => {
//         if (!content?.trim()) {
//             setError('No content to rewrite');
//             return;
//         }

//         // CHECK API BASE URL HERE - THIS IS WHERE IT'S ACTUALLY USED
//         console.log('🔧 Checking API Base URL:', apiBaseUrl);
        
//         if (!apiBaseUrl) {
//             setError(`API base URL not configured. Please check your environment variables. 
//                      Expected: VITE_API_BASE_URL, REACT_APP_API_BASE_URL, or NEXT_PUBLIC_API_BASE_URL`);
//             return;
//         }

//         setRewriting(true);
//         setRewritingProgress(0);
//         setError('');

//         try {
//             setRewritingProgress(25);
            
//             const rewritePrompt = `Transform the following scraped web content into 100% unique, humanized content that is completely undetectable by AI detection tools. 

// Requirements:
// - Make it sound natural and human-written
// - Maintain all important information and key points
// - Use varied sentence structures and natural language patterns
// - Add personal insights and conversational elements where appropriate
// - Ensure it's completely original and plagiarism-free
// - Keep the content informative and well-organized
// - Use proper formatting with headings and structure

// Original content to rewrite:
// ${content}

// Please rewrite this content to be engaging, unique, and indistinguishable from human-written content.`;

//             setRewritingProgress(50);

//             console.log('🚀 Making API request to:', `${apiBaseUrl}/rewrite`);

//             const response = await axios.post(
//                 `${apiBaseUrl}/rewrite`,
//                 {
//                     input: rewritePrompt,
//                     action: "Write a humanized, 100% unique content that is undetectable by AI"
//                 },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                     timeout: 60000 // 60 second timeout
//                 }
//             );

//             setRewritingProgress(90);

//             if (response.data && response.data.modifiedText) {
//                 setRewrittenContent(response.data.modifiedText);
                
//                 // Trigger callback if provided
//                 if (onContentGenerated) {
//                     onContentGenerated({
//                         originalUrl: url,
//                         scrapedContent: content,
//                         rewrittenContent: response.data.modifiedText,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             } else {
//                 throw new Error('No rewritten content received from API');
//             }

//             setRewritingProgress(100);

//         } catch (error) {
//             console.error('Rewriting error:', error);
//             if (error.message.includes('Network Error') || error.message.includes('connect')) {
//                 setError(`Cannot connect to API server at ${apiBaseUrl}. Please check if the server is running.`);
//             } else {
//                 setError(`Rewriting failed: ${error.message}`);
//             }
//         } finally {
//             setRewriting(false);
//             setTimeout(() => setRewritingProgress(0), 3000);
//         }
//     };

//     // Clear all cached content
//     const clearCache = () => {
//         urlMemory.current.clear();
//         setScrapedContent('');
//         setRewrittenContent('');
//         setUrlStats(null);
//         setError('');
//     };

//     // Copy content to clipboard
//     const copyToClipboard = async (content) => {
//         try {
//             await navigator.clipboard.writeText(content);
//             // You might want to show a toast notification here
//         } catch (error) {
//             console.error('Failed to copy to clipboard:', error);
//         }
//     };

//     // Format rewritten content with rich styling
//     const formatRewrittenContent = (content) => {
//         if (!content) return '';
        
//         // Split content into paragraphs and format
//         const paragraphs = content.split('\n\n').filter(p => p.trim());
        
//         return paragraphs.map((paragraph, index) => {
//             const trimmedParagraph = paragraph.trim();
            
//             // Check if it's a heading (starts with # or is all caps and short)
//             if (trimmedParagraph.startsWith('#')) {
//                 const level = trimmedParagraph.match(/^#+/)[0].length;
//                 const text = trimmedParagraph.replace(/^#+\s*/, '');
//                 const headingClass = level === 1 ? 'text-2xl font-bold text-gray-800 mb-4 mt-6' :
//                                    level === 2 ? 'text-xl font-semibold text-gray-800 mb-3 mt-5' :
//                                    'text-lg font-medium text-gray-800 mb-2 mt-4';
//                 return (
//                     <div key={index} className={headingClass}>
//                         {text}
//                     </div>
//                 );
//             }
            
//             // Check if it looks like a heading (short, all caps, or ends with colon)
//             if (trimmedParagraph.length < 60 && 
//                 (trimmedParagraph === trimmedParagraph.toUpperCase() || 
//                  trimmedParagraph.endsWith(':') ||
//                  /^[A-Z][^.!?]*:?\s*$/.test(trimmedParagraph))) {
//                 return (
//                     <div key={index} className="text-lg font-semibold text-gray-800 mb-3 mt-5">
//                         {trimmedParagraph}
//                     </div>
//                 );
//             }
            
//             // Regular paragraph
//             return (
//                 <div key={index} className="text-base leading-relaxed text-gray-700 mb-4 text-justify">
//                     {trimmedParagraph}
//                 </div>
//             );
//         });
//     };

//     return (
//         <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
//             {/* Enhanced Cache Stats */}
//             {urlStats && (
//                 <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <div className="text-sm text-green-700">
//                             <span className="font-semibold">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
//                         </div>
//                         <button
//                             onClick={clearCache}
//                             className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium self-start sm:self-auto"
//                         >
//                             Clear Cache
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* URL Input Section */}
//             <div className="space-y-4">
//                 <div>
//                     <label htmlFor="url-input" className="block mb-3 text-sm font-semibold text-gray-800">
//                         Website URL (Enhanced Multi-Proxy Scraper)
//                     </label>
//                     <div className="flex flex-col sm:flex-row gap-3">
//                         <input
//                             type="text"
//                             id="url-input"
//                             value={url}
//                             onChange={(e) => setUrl(e.target.value)}
//                             placeholder="https://example.com/article"
//                             className="flex-1 bg-white border-2 border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 transition-all duration-200"
//                             onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
//                         />
//                         <button
//                             onClick={handleScrapeUrl}
//                             disabled={scraping || !url.trim()}
//                             className="px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
//                         >
//                             {scraping ? 'Scraping...' : 'Scrape'}
//                         </button>
//                     </div>
//                     <p className="from-neutral-content text-neutral-500 text-xs font-sans mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
//                         🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
//                     </p>
//                 </div>

//                 {/* Auto-rewrite toggle */}
//                 <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
//                     <input
//                         type="checkbox"
//                         id="auto-rewrite"
//                         checked={autoRewrite}
//                         onChange={(e) => setAutoRewrite(e.target.checked)}
//                         className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//                     />
//                     <label htmlFor="auto-rewrite" className="text-sm text-gray-700 font-medium">
//                         Automatically rewrite content after scraping
//                     </label>
//                 </div>
//             </div>

//             {/* Enhanced Progress Indicators */}
//             {(scraping || scrapingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-blue-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-emerald-800">Enhanced Scraping Progress</span>
//                         <span className="text-sm font-bold text-emerald-800">{scrapingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${scrapingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <p className="text-sm text-blue-700 font-medium bg-white p-2 rounded-lg">{currentStep}</p>
//                     )}
//                 </div>
//             )}

//             {(rewriting || rewritingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-green-700">Rewriting Progress</span>
//                         <span className="text-sm font-bold text-green-700">{rewritingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-green-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${rewritingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <div className="p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
//                     <div className="flex items-start">
//                         <span className="text-red-500 mr-3 text-lg">⚠️</span>
//                         <span className="text-sm text-red-700 leading-relaxed">{error}</span>
//                     </div>
//                 </div>
//             )}

//             {/* Scraped Content Display */}
//             {scrapedContent && (
//                 <div className="space-y-4 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             Scraped Content 
//                             <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
//                                 Enhanced Extraction
//                             </span>
//                         </h3>
//                         <div className="flex gap-2 flex-wrap">
//                             <button
//                                 onClick={() => copyToClipboard(scrapedContent)}
//                                 className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
//                             >
//                                 Copy
//                             </button>
//                             {!autoRewrite && (
//                                 <button
//                                     onClick={() => handleRewriteContent()}
//                                     disabled={rewriting}
//                                     className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors font-medium"
//                                 >
//                                     {rewriting ? 'Rewriting...' : 'Rewrite'}
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                     <div className="max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 custom-scrollbar">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
//                             {scrapedContent.length > 1000 
//                                 ? `${scrapedContent.substring(0, 1000)}...` 
//                                 : scrapedContent
//                             }
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
//                         📊 {scrapedContent.split(' ').length.toLocaleString()} words • {scrapedContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Rewritten Content Display with Rich Styling */}
//             {rewrittenContent && (
//                 <div className="space-y-4 border border-green-200 rounded-xl p-6 bg-gradient-to-br from-white to-green-50 shadow-lg">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             AI Rewritten Content 
//                             <span className="ml-3 text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full font-semibold shadow-sm">
//                                 100% Unique & Humanized
//                             </span>
//                         </h3>
//                         <button
//                             onClick={() => copyToClipboard(rewrittenContent)}
//                             className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium shadow-sm"
//                         >
//                             Copy Content
//                         </button>
//                     </div>
                    
//                     {/* Rich styled content container */}
//                     <div className="max-h-96 overflow-y-auto bg-white p-6 rounded-xl border border-green-200 shadow-inner custom-scrollbar">
//                         <div className="prose prose-sm sm:prose max-w-none">
//                             {formatRewrittenContent(rewrittenContent)}
//                         </div>
//                     </div>
                    
//                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-100">
//                         <div className="flex items-center gap-4">
//                             <span>📝 {rewrittenContent.split(' ').length.toLocaleString()} words</span>
//                             <span>📄 {rewrittenContent.length.toLocaleString()} characters</span>
//                         </div>
//                         <div className="flex items-center text-green-600">
//                             <span className="animate-pulse">✨</span>
//                             <span className="ml-1 font-medium">AI Enhanced Content</span>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Real-time Status Display */}
//             {(scraping || rewriting) && (
//                 <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm z-50">
//                     <div className="flex items-center">
//                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
//                         <div className="text-sm font-medium">
//                             {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
//                             {rewriting && <span className="text-green-600">Creating unique content...</span>}
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-lg">{currentStep}</div>
//                     )}
//                 </div>
//             )}

//             {/* Custom Scrollbar Styles */}
//             <style jsx>{`
//                 .custom-scrollbar::-webkit-scrollbar {
//                     width: 8px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-track {
//                     background: #f1f5f9;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb {
//                     background: #cbd5e1;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//                     background: #94a3b8;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default Scrap;





























// import React, { useState, useRef } from 'react';
// import axios from 'axios';
// import { parseResponse } from '../../../util/parseresponse'; // Import parseResponse function

// class URLContentMemory {
//     constructor() {
//         this.urlCache = new Map();
//         this.maxCacheSize = 30;
//         this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
//     }

//     store(url, data, metadata = {}) {
//         if (this.urlCache.size >= this.maxCacheSize) {
//             const firstKey = this.urlCache.keys().next().value;
//             this.urlCache.delete(firstKey);
//         }

//         const contentData = {
//             content: data,
//             metadata: {
//                 ...metadata,
//                 timestamp: Date.now(),
//                 size: new Blob([data]).size,
//                 url: url
//             }
//         };

//         this.urlCache.set(url, contentData);
//         return url;
//     }

//     get(url) {
//         return this.urlCache.get(url);
//     }

//     has(url) {
//         return this.urlCache.has(url);
//     }

//     clear() {
//         this.urlCache.clear();
//     }

//     getStats() {
//         let totalSize = 0;
//         this.urlCache.forEach(content => {
//             totalSize += content.metadata.size || 0;
//         });

//         return {
//             urlsCount: this.urlCache.size,
//             totalSize: totalSize,
//             totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
//         };
//     }
// }

// const Scrap = ({ onContentGenerated }) => {
//     const getApiBaseUrl = () => {
//         if (typeof import.meta !== 'undefined' && import.meta.env) {
//             return import.meta.env.VITE_API_BASE_URL;
//         }
//         if (typeof process !== 'undefined' && process.env) {
//             return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
//         }
//         return null;
//     };

//     const apiBaseUrl = getApiBaseUrl();

//     const [url, setUrl] = useState('');
//     const [scrapedContent, setScrapedContent] = useState('');
//     const [rewrittenContent, setRewrittenContent] = useState('');
//     const [scraping, setScraping] = useState(false);
//     const [rewriting, setRewriting] = useState(false);
//     const [scrapingProgress, setScrapingProgress] = useState(0);
//     const [rewritingProgress, setRewritingProgress] = useState(0);
//     const [urlStats, setUrlStats] = useState(null);
//     const [error, setError] = useState('');
//     const [currentStep, setCurrentStep] = useState('');
//     const [autoRewrite, setAutoRewrite] = useState(true);

//     const urlMemory = useRef(new URLContentMemory());

//     const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//     const proxyServices = [
//         {
//             name: 'ThingProxy',
//             url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'CORS.sh',
//             url: (targetUrl) => `https://cors.sh/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'Proxy6 CORS',
//             url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
//             extractContent: (response) => response.data
//         }
//     ];

//     const isValidUrl = (string) => {
//         try {
//             const urlObj = new URL(string);
//             return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
//         } catch (_) {
//             return false;
//         }
//     };

//     const normalizeUrl = (inputUrl) => {
//         let cleanUrl = inputUrl.trim();
//         if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
//             cleanUrl = 'https://' + cleanUrl;
//         }
//         return cleanUrl;
//     };

//     const extractTextFromHTML = (html) => {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');

//             const unwantedSelectors = [
//                 'script', 'style', 'nav', 'footer', 'header', 'aside',
//                 '.advertisement', '.ads', '.social', '.comments',
//                 '.sidebar', '.menu', '.navigation', '.breadcrumb',
//                 '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
//             ];

//             unwantedSelectors.forEach(selector => {
//                 const elements = doc.querySelectorAll(selector);
//                 elements.forEach(element => element.remove());
//             });

//             const contentSelectors = [
//                 'article',
//                 'main',
//                 '[role="main"]',
//                 '.content',
//                 '.post-content',
//                 '.entry-content',
//                 '.article-content',
//                 '.post',
//                 '.article',
//                 '#content',
//                 '.container',
//                 '.wrapper',
//                 'body'
//             ];

//             let extractedText = '';
//             let bestMatch = null;
//             let maxLength = 0;

//             for (const selector of contentSelectors) {
//                 const elements = doc.querySelectorAll(selector);
//                 for (const element of elements) {
//                     const text = element.textContent || '';
//                     if (text.length > maxLength) {
//                         maxLength = text.length;
//                         bestMatch = text;
//                     }
//                 }
//                 if (bestMatch && maxLength > 500) break;
//             }

//             extractedText = bestMatch || doc.body?.textContent || '';

//             const cleanedText = extractedText
//                 .replace(/\s+/g, ' ')
//                 .replace(/\n\s*\n/g, '\n')
//                 .replace(/[\r\n\t]+/g, '\n')
//                 .replace(/\u00A0/g, ' ')
//                 .trim();

//             return cleanedText;
//         } catch (error) {
//             throw new Error(`HTML parsing failed: ${error.message}`);
//         }
//     };

//     const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
//         let lastError = null;

//         for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
//             const proxy = proxyServices[proxyIndex];

//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//                 try {
//                     setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);

//                     const requestConfig = {
//                         timeout: 45000,
//                         headers: {
//                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                             'Accept-Language': 'en-US,en;q=0.5',
//                             'Accept-Encoding': 'gzip, deflate',
//                             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                             ...proxy.headers
//                         }
//                     };

//                     const response = await axios.get(proxy.url(targetUrl), requestConfig);
//                     const content = proxy.extractContent(response);

//                     if (!content || content.length < 100) {
//                         throw new Error('Insufficient content received');
//                     }

//                     return { data: content };

//                 } catch (error) {
//                     lastError = error;
//                     const isLastAttempt = attempt === maxRetries;
//                     const isLastProxy = proxyIndex === proxyServices.length - 1;

//                     if (!isLastAttempt || !isLastProxy) {
//                         const retryDelay = Math.min(2000 * attempt, 10000);
//                         setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay / 1000}s...`);
//                         await sleep(retryDelay);
//                     }
//                 }
//             }
//         }

//         try {
//             setCurrentStep('Trying direct fetch as last resort...');
//             const response = await axios.get(targetUrl, {
//                 timeout: 30000,
//                 headers: {
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//                 }
//             });
//             return { data: response.data };
//         } catch (directError) {
//             throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
//         }
//     };

//     const handleScrapeUrl = async () => {
//         if (!url.trim()) {
//             setError('Please enter a URL');
//             return;
//         }

//         const normalizedUrl = normalizeUrl(url);

//         if (!isValidUrl(normalizedUrl)) {
//             setError('Please enter a valid URL');
//             return;
//         }

//         setScraping(true);
//         setError('');
//         setScrapedContent('');
//         setRewrittenContent('');
//         setScrapingProgress(0);
//         setCurrentStep('Initializing enhanced scraper...');

//         try {
//             if (urlMemory.current.has(normalizedUrl)) {
//                 setCurrentStep('Loading from cache...');
//                 setScrapingProgress(50);
//                 const cachedData = urlMemory.current.get(normalizedUrl);
//                 setScrapedContent(cachedData.content);
//                 setScrapingProgress(100);
//                 setCurrentStep('Content loaded from cache');

//                 if (autoRewrite && cachedData.content.trim()) {
//                     await handleRewriteContent(cachedData.content);
//                 }
//                 return;
//             }

//             setCurrentStep('Starting multi-proxy fetch...');
//             setScrapingProgress(10);

//             const response = await fetchWithEnhancedProxy(normalizedUrl);

//             setCurrentStep('Analyzing and parsing content...');
//             setScrapingProgress(60);

//             await sleep(1000);

//             const extractedText = extractTextFromHTML(response.data);

//             if (!extractedText.trim() || extractedText.length < 50) {
//                 throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
//             }

//             setCurrentStep('Processing and storing content...');
//             setScrapingProgress(80);

//             const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
//             const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';

//             const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

//             urlMemory.current.store(normalizedUrl, extractedText, {
//                 title: title,
//                 scrapedAt: new Date().toISOString(),
//                 wordCount: wordCount,
//                 characterCount: extractedText.length,
//                 domain: new URL(normalizedUrl).hostname
//             });

//             setScrapedContent(extractedText);
//             setUrlStats(urlMemory.current.getStats());
//             setScrapingProgress(100);
//             setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

//             if (autoRewrite) {
//                 await sleep(1500);
//                 await handleRewriteContent(extractedText);
//             }

//         } catch (error) {
//             console.error('Enhanced scraping error:', error);
//             setError(`Scraping failed: ${error.message}`);
//             setCurrentStep('');
//             if (error.message.includes('timeout')) {
//                 setError(error.message + ' - The website might be slow or blocking requests.');
//             } else if (error.message.includes('Network Error')) {
//                 setError('Network error - Check your internet connection or try a different URL.');
//             }
//         } finally {
//             setScraping(false);
//             setTimeout(() => {
//                 setScrapingProgress(0);
//                 if (!error) setCurrentStep('');
//             }, 3000);
//         }
//     };

//     const handleRewriteContent = async (content = scrapedContent) => {
//         if (!content?.trim()) {
//             setError('No content to rewrite');
//             return;
//         }

//         if (!apiBaseUrl) {
//             setError(`API base URL not configured. Please check your environment variables.`);
//             return;
//         }

//         setRewriting(true);
//         setRewritingProgress(0);
//         setError('');

//         try {
//             setRewritingProgress(25);

//             const rewritePrompt = `Rewrite the following content into 100% unique, humanized content. Do not include any explanations or introductory phrases. Just output the clean, rewritten content without additional comments or text. Ensure it reads naturally and is well-structured for readability.

// Requirements:
// - Make it sound natural and human-written
// - Maintain all important information and key points
// - Use varied sentence structures and natural language patterns
// - Add personal insights and conversational elements where appropriate
// - Ensure it's completely original and plagiarism-free
// - Keep the content informative and well-organized
// - Use proper formatting with headings and structure

// Original content to rewrite:
// ${content}

// Please rewrite this content to be engaging, unique, and indistinguishable from human-written content.`;

//             setRewritingProgress(50);

//             const response = await axios.post(
//                 `${apiBaseUrl}/rewrite`,
//                 {
//                     input: rewritePrompt,
//                     action: "Write a humanized, 100% unique content that is undetectable by AI"
//                 },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                     timeout: 60000
//                 }
//             );

//             setRewritingProgress(90);

//             if (response.data && response.data.modifiedText) {
//                 // Remove the introductory AI response like "Okay, here's a rewrite..."
//                 const cleanedRewrittenContent = response.data.modifiedText.replace(/^(Okay, here's a rewrite[^\n]*\n?)/, "").trim();
//                 setRewrittenContent(cleanedRewrittenContent);

//                 if (onContentGenerated) {
//                     onContentGenerated({
//                         originalUrl: url,
//                         scrapedContent: content,
//                         rewrittenContent: cleanedRewrittenContent,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             } else {
//                 throw new Error('No rewritten content received from API');
//             }

//             setRewritingProgress(100);

//         } catch (error) {
//             console.error('Rewriting error:', error);
//             if (error.message.includes('Network Error') || error.message.includes('connect')) {
//                 setError(`Cannot connect to API server at ${apiBaseUrl}. Please check if the server is running.`);
//             } else {
//                 setError(`Rewriting failed: ${error.message}`);
//             }
//         } finally {
//             setRewriting(false);
//             setTimeout(() => setRewritingProgress(0), 3000);
//         }
//     };

//     const clearCache = () => {
//         urlMemory.current.clear();
//         setScrapedContent('');
//         setRewrittenContent('');
//         setUrlStats(null);
//         setError('');
//     };

//     const copyToClipboard = async (content) => {
//         try {
//             await navigator.clipboard.writeText(content);
//         } catch (error) {
//             console.error('Failed to copy to clipboard:', error);
//         }
//     };

//     return (
//         <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
//             {/* Enhanced Cache Stats */}
//             {urlStats && (
//                 <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <div className="text-sm text-green-700">
//                             <span className="font-semibold">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
//                         </div>
//                         <button
//                             onClick={clearCache}
//                             className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium self-start sm:self-auto"
//                         >
//                             Clear Cache
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* URL Input Section */}
//             <div className="space-y-4">
//                 <div>
//                     <label htmlFor="url-input" className="block mb-3 text-2xl font-semibold text-gray-600">
//                         Website URL (Enhanced Multi-Proxy Scraper)
//                     </label>
//                     <div className="flex flex-col sm:flex-row gap-3">
//                         <input
//                             type="text"
//                             id="url-input"
//                             value={url}
//                             onChange={(e) => setUrl(e.target.value)}
//                             placeholder="https://example.com/article"
//                             className="flex-1 bg-white border-2 border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 transition-all duration-200"
//                             onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
//                         />
//                         <button
//                             onClick={handleScrapeUrl}
//                             disabled={scraping || !url.trim()}
//                             className="px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
//                         >
//                             {scraping ? 'Scraping...' : 'Scrape'}
//                         </button>
//                     </div>
//                     <p className="from-neutral-content text-neutral-500 text-xs font-sans mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
//                         🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
//                     </p>
//                 </div>

//                 {/* Auto-rewrite toggle */}
//                 <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
//                     <input
//                         type="checkbox"
//                         id="auto-rewrite"
//                         checked={autoRewrite}
//                         onChange={(e) => setAutoRewrite(e.target.checked)}
//                         className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//                     />
//                     <label htmlFor="auto-rewrite" className="text-sm text-gray-700 font-medium">
//                         Automatically rewrite content after scraping
//                     </label>
//                 </div>
//             </div>

//             {/* Enhanced Progress Indicators */}
//             {(scraping || scrapingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-blue-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-emerald-800">Enhanced Scraping Progress</span>
//                         <span className="text-sm font-bold text-emerald-800">{scrapingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${scrapingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <p className="text-sm text-blue-700 font-medium bg-white p-2 rounded-lg">{currentStep}</p>
//                     )}
//                 </div>
//             )}

//             {(rewriting || rewritingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-green-700">Rewriting Progress</span>
//                         <span className="text-sm font-bold text-green-700">{rewritingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-green-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${rewritingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <div className="p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
//                     <div className="flex items-start">
//                         <span className="text-red-500 mr-3 text-lg">⚠️</span>
//                         <span className="text-sm text-red-700 leading-relaxed">{error}</span>
//                     </div>
//                 </div>
//             )}

//             {/* Scraped Content Display */}
//             {scrapedContent && (
//                 <div className="space-y-4 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             Scraped Content 
//                             <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
//                                 Enhanced Extraction
//                             </span>
//                         </h3>
//                         <div className="flex gap-2 flex-wrap">
//                             <button
//                                 onClick={() => copyToClipboard(scrapedContent)}
//                                 className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
//                             >
//                                 Copy
//                             </button>
//                             {!autoRewrite && (
//                                 <button
//                                     onClick={() => handleRewriteContent()}
//                                     disabled={rewriting}
//                                     className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors font-medium"
//                                 >
//                                     {rewriting ? 'Rewriting...' : 'Rewrite'}
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                     <div className="max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 custom-scrollbar">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
//                             {scrapedContent.length > 1000 
//                                 ? `${scrapedContent.substring(0, 1000)}...` 
//                                 : scrapedContent
//                             }
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
//                         📊 {scrapedContent.split(' ').length.toLocaleString()} words • {scrapedContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Rewritten Content Display with Rich Styling */}
//             {rewrittenContent && (
//                 <div className="space-y-4 border border-green-200 rounded-xl p-6 bg-gradient-to-br from-white to-green-50 shadow-lg">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             AI Rewritten Content 
//                             <span className="ml-3 text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full font-semibold shadow-sm">
//                                 100% Unique & Humanized
//                             </span>
//                         </h3>
//                         <button
//                             onClick={() => copyToClipboard(rewrittenContent)}
//                             className="absolute top-3 right-3 text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium shadow-sm"
//                         >
//                             Copy Content
//                         </button>
//                     </div>
                    
//                     {/* Rich styled content container */}
//                     <div className="max-h-96 overflow-y-auto bg-white p-6 rounded-xl border border-green-200 shadow-inner custom-scrollbar">
//                         <div className="prose prose-sm sm:prose max-w-none">
//                             {parseResponse(rewrittenContent)}  {/* Render markdown content */}
//                         </div>
//                     </div>
                    
//                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-100">
//                         <div className="flex items-center gap-4">
//                             <span>📝 {rewrittenContent.split(' ').length.toLocaleString()} words</span>
//                             <span>📄 {rewrittenContent.length.toLocaleString()} characters</span>
//                         </div>
//                         <div className="flex items-center text-green-600">
//                             <span className="animate-pulse">✨</span>
//                             <span className="ml-1 font-medium">AI Enhanced Content</span>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Real-time Status Display */}
//             {(scraping || rewriting) && (
//                 <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm z-50">
//                     <div className="flex items-center">
//                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
//                         <div className="text-sm font-medium">
//                             {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
//                             {rewriting && <span className="text-green-600">Creating unique content...</span>}
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-lg">{currentStep}</div>
//                     )}
//                 </div>
//             )}

//             {/* Custom Scrollbar Styles */}
//             <style jsx>{`
//                 .custom-scrollbar::-webkit-scrollbar {
//                     width: 8px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-track {
//                     background: #f1f5f9;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb {
//                     background: #cbd5e1;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//                     background: #94a3b8;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default Scrap;




















// import React, { useState, useRef } from 'react';
// import axios from 'axios';
// import { parseResponse } from '../../../util/parseresponse'; // Import parseResponse function

// class URLContentMemory {
//     constructor() {
//         this.urlCache = new Map();
//         this.maxCacheSize = 30;
//         this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
//     }

//     store(url, data, metadata = {}) {
//         if (this.urlCache.size >= this.maxCacheSize) {
//             const firstKey = this.urlCache.keys().next().value;
//             this.urlCache.delete(firstKey);
//         }

//         const contentData = {
//             content: data,
//             metadata: {
//                 ...metadata,
//                 timestamp: Date.now(),
//                 size: new Blob([data]).size,
//                 url: url
//             }
//         };

//         this.urlCache.set(url, contentData);
//         return url;
//     }

//     get(url) {
//         return this.urlCache.get(url);
//     }

//     has(url) {
//         return this.urlCache.has(url);
//     }

//     clear() {
//         this.urlCache.clear();
//     }

//     getStats() {
//         let totalSize = 0;
//         this.urlCache.forEach(content => {
//             totalSize += content.metadata.size || 0;
//         });

//         return {
//             urlsCount: this.urlCache.size,
//             totalSize: totalSize,
//             totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
//         };
//     }
// }

// const Scrap = ({ onContentGenerated }) => {
//     const getApiBaseUrl = () => {
//         if (typeof import.meta !== 'undefined' && import.meta.env) {
//             return import.meta.env.VITE_API_BASE_URL;
//         }
//         if (typeof process !== 'undefined' && process.env) {
//             return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
//         }
//         return null;
//     };

//     const apiBaseUrl = getApiBaseUrl();

//     const [url, setUrl] = useState('');
//     const [scrapedContent, setScrapedContent] = useState('');
//     const [rewrittenContent, setRewrittenContent] = useState('');
//     const [scraping, setScraping] = useState(false);
//     const [rewriting, setRewriting] = useState(false);
//     const [scrapingProgress, setScrapingProgress] = useState(0);
//     const [rewritingProgress, setRewritingProgress] = useState(0);
//     const [urlStats, setUrlStats] = useState(null);
//     const [error, setError] = useState('');
//     const [currentStep, setCurrentStep] = useState('');
//     const [autoRewrite, setAutoRewrite] = useState(true);

//     const urlMemory = useRef(new URLContentMemory());

//     const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//     const proxyServices = [
//         {
//             name: 'ThingProxy',
//             url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'CORS.sh',
//             url: (targetUrl) => `https://cors.sh/${targetUrl}`,
//             extractContent: (response) => response.data
//         },
//         {
//             name: 'Proxy6 CORS',
//             url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
//             extractContent: (response) => response.data
//         }
//     ];

//     const isValidUrl = (string) => {
//         try {
//             const urlObj = new URL(string);
//             return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
//         } catch (_) {
//             return false;
//         }
//     };

//     const normalizeUrl = (inputUrl) => {
//         let cleanUrl = inputUrl.trim();
//         if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
//             cleanUrl = 'https://' + cleanUrl;
//         }
//         return cleanUrl;
//     };

//     const extractTextFromHTML = (html) => {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');

//             const unwantedSelectors = [
//                 'script', 'style', 'nav', 'footer', 'header', 'aside',
//                 '.advertisement', '.ads', '.social', '.comments',
//                 '.sidebar', '.menu', '.navigation', '.breadcrumb',
//                 '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
//             ];

//             unwantedSelectors.forEach(selector => {
//                 const elements = doc.querySelectorAll(selector);
//                 elements.forEach(element => element.remove());
//             });

//             const contentSelectors = [
//                 'article',
//                 'main',
//                 '[role="main"]',
//                 '.content',
//                 '.post-content',
//                 '.entry-content',
//                 '.article-content',
//                 '.post',
//                 '.article',
//                 '#content',
//                 '.container',
//                 '.wrapper',
//                 'body'
//             ];

//             let extractedText = '';
//             let bestMatch = null;
//             let maxLength = 0;

//             for (const selector of contentSelectors) {
//                 const elements = doc.querySelectorAll(selector);
//                 for (const element of elements) {
//                     const text = element.textContent || '';
//                     if (text.length > maxLength) {
//                         maxLength = text.length;
//                         bestMatch = text;
//                     }
//                 }
//                 if (bestMatch && maxLength > 500) break;
//             }

//             extractedText = bestMatch || doc.body?.textContent || '';

//             const cleanedText = extractedText
//                 .replace(/\s+/g, ' ')
//                 .replace(/\n\s*\n/g, '\n')
//                 .replace(/[\r\n\t]+/g, '\n')
//                 .replace(/\u00A0/g, ' ')
//                 .trim();

//             return cleanedText;
//         } catch (error) {
//             throw new Error(`HTML parsing failed: ${error.message}`);
//         }
//     };

//     const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
//         let lastError = null;

//         for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
//             const proxy = proxyServices[proxyIndex];

//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//                 try {
//                     setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);

//                     const requestConfig = {
//                         timeout: 45000,
//                         headers: {
//                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                             'Accept-Language': 'en-US,en;q=0.5',
//                             'Accept-Encoding': 'gzip, deflate',
//                             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                             ...proxy.headers
//                         }
//                     };

//                     const response = await axios.get(proxy.url(targetUrl), requestConfig);
//                     const content = proxy.extractContent(response);

//                     if (!content || content.length < 100) {
//                         throw new Error('Insufficient content received');
//                     }

//                     return { data: content };

//                 } catch (error) {
//                     lastError = error;
//                     const isLastAttempt = attempt === maxRetries;
//                     const isLastProxy = proxyIndex === proxyServices.length - 1;

//                     if (!isLastAttempt || !isLastProxy) {
//                         const retryDelay = Math.min(2000 * attempt, 10000);
//                         setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay / 1000}s...`);
//                         await sleep(retryDelay);
//                     }
//                 }
//             }
//         }

//         try {
//             setCurrentStep('Trying direct fetch as last resort...');
//             const response = await axios.get(targetUrl, {
//                 timeout: 30000,
//                 headers: {
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//                 }
//             });
//             return { data: response.data };
//         } catch (directError) {
//             throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
//         }
//     };

//     const handleScrapeUrl = async () => {
//         if (!url.trim()) {
//             setError('Please enter a URL');
//             return;
//         }

//         const normalizedUrl = normalizeUrl(url);

//         if (!isValidUrl(normalizedUrl)) {
//             setError('Please enter a valid URL');
//             return;
//         }

//         setScraping(true);
//         setError('');
//         setScrapedContent('');
//         setRewrittenContent('');
//         setScrapingProgress(0);
//         setCurrentStep('Initializing enhanced scraper...');

//         try {
//             if (urlMemory.current.has(normalizedUrl)) {
//                 setCurrentStep('Loading from cache...');
//                 setScrapingProgress(50);
//                 const cachedData = urlMemory.current.get(normalizedUrl);
//                 setScrapedContent(cachedData.content);
//                 setScrapingProgress(100);
//                 setCurrentStep('Content loaded from cache');

//                 if (autoRewrite && cachedData.content.trim()) {
//                     await handleRewriteContent(cachedData.content);
//                 }
//                 return;
//             }

//             setCurrentStep('Starting multi-proxy fetch...');
//             setScrapingProgress(10);

//             const response = await fetchWithEnhancedProxy(normalizedUrl);

//             setCurrentStep('Analyzing and parsing content...');
//             setScrapingProgress(60);

//             await sleep(1000);

//             const extractedText = extractTextFromHTML(response.data);

//             if (!extractedText.trim() || extractedText.length < 50) {
//                 throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
//             }

//             setCurrentStep('Processing and storing content...');
//             setScrapingProgress(80);

//             const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
//             const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';

//             const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

//             urlMemory.current.store(normalizedUrl, extractedText, {
//                 title: title,
//                 scrapedAt: new Date().toISOString(),
//                 wordCount: wordCount,
//                 characterCount: extractedText.length,
//                 domain: new URL(normalizedUrl).hostname
//             });

//             setScrapedContent(extractedText);
//             setUrlStats(urlMemory.current.getStats());
//             setScrapingProgress(100);
//             setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

//             if (autoRewrite) {
//                 await sleep(1500);
//                 await handleRewriteContent(extractedText);
//             }

//         } catch (error) {
//             console.error('Enhanced scraping error:', error);
//             setError(`Scraping failed: ${error.message}`);
//             setCurrentStep('');
//             if (error.message.includes('timeout')) {
//                 setError(error.message + ' - The website might be slow or blocking requests.');
//             } else if (error.message.includes('Network Error')) {
//                 setError('Network error - Check your internet connection or try a different URL.');
//             }
//         } finally {
//             setScraping(false);
//             setTimeout(() => {
//                 setScrapingProgress(0);
//                 if (!error) setCurrentStep('');
//             }, 3000);
//         }
//     };

//     const handleRewriteContent = async (content = scrapedContent) => {
//         if (!content?.trim()) {
//             setError('No content to rewrite');
//             return;
//         }

//         if (!apiBaseUrl) {
//             setError(`API base URL not configured. Please check your environment variables.`);
//             return;
//         }

//         setRewriting(true);
//         setRewritingProgress(0);
//         setError('');

//         try {
//             setRewritingProgress(25);

//             // Updated prompt to make sure AI only returns the rewritten content with no explanations
//             const rewritePrompt = `Rewrite the following content into 100% unique, humanized content. Do not include any explanations or introductory phrases. Just output the clean, rewritten content without additional comments or text. Ensure it reads naturally and is well-structured for readability.

// Original content to rewrite:
// ${content}`;

//             setRewritingProgress(50);

//             const response = await axios.post(
//                 `${apiBaseUrl}/rewrite`,
//                 {
//                     input: rewritePrompt,
//                     action: "Write a humanized, 100% unique content without explanations"
//                 },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                     timeout: 60000
//                 }
//             );

//             setRewritingProgress(90);

//             if (response.data && response.data.modifiedText) {
//                 // Directly set the rewritten content (no need to clean it further)
//                 setRewrittenContent(response.data.modifiedText);

//                 if (onContentGenerated) {
//                     onContentGenerated({
//                         originalUrl: url,
//                         scrapedContent: content,
//                         rewrittenContent: response.data.modifiedText,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             } else {
//                 throw new Error('No rewritten content received from API');
//             }

//             setRewritingProgress(100);

//         } catch (error) {
//             console.error('Rewriting error:', error);
//             if (error.message.includes('Network Error') || error.message.includes('connect')) {
//                 setError(`Cannot connect to API server at ${apiBaseUrl}. Please check if the server is running.`);
//             } else {
//                 setError(`Rewriting failed: ${error.message}`);
//             }
//         } finally {
//             setRewriting(false);
//             setTimeout(() => setRewritingProgress(0), 3000);
//         }
//     };

//     const clearCache = () => {
//         urlMemory.current.clear();
//         setScrapedContent('');
//         setRewrittenContent('');
//         setUrlStats(null);
//         setError('');
//     };

//     const copyToClipboard = async (content) => {
//         try {
//             await navigator.clipboard.writeText(content);
//         } catch (error) {
//             console.error('Failed to copy to clipboard:', error);
//         }
//     };

//     return (
//         <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
//             {/* Enhanced Cache Stats */}
//             {urlStats && (
//                 <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <div className="text-sm text-green-700">
//                             <span className="font-semibold">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
//                         </div>
//                         <button
//                             onClick={clearCache}
//                             className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium self-start sm:self-auto"
//                         >
//                             Clear Cache
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* URL Input Section */}
//             <div className="space-y-4">
//                 <div>
//                     <label htmlFor="url-input" className="block mb-3 text-sm font-semibold text-gray-800">
//                         Website URL (Enhanced Multi-Proxy Scraper)
//                     </label>
//                     <div className="flex flex-col sm:flex-row gap-3">
//                         <input
//                             type="text"
//                             id="url-input"
//                             value={url}
//                             onChange={(e) => setUrl(e.target.value)}
//                             placeholder="https://example.com/article"
//                             className="flex-1 bg-white border-2 border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 transition-all duration-200"
//                             onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
//                         />
//                         <button
//                             onClick={handleScrapeUrl}
//                             disabled={scraping || !url.trim()}
//                             className="px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
//                         >
//                             {scraping ? 'Scraping...' : 'Scrape'}
//                         </button>
//                     </div>
//                     <p className="from-neutral-content text-neutral-500 text-xs font-sans mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
//                         🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
//                     </p>
//                 </div>

//                 {/* Auto-rewrite toggle */}
//                 <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
//                     <input
//                         type="checkbox"
//                         id="auto-rewrite"
//                         checked={autoRewrite}
//                         onChange={(e) => setAutoRewrite(e.target.checked)}
//                         className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//                     />
//                     <label htmlFor="auto-rewrite" className="text-sm text-gray-700 font-medium">
//                         Automatically rewrite content after scraping
//                     </label>
//                 </div>
//             </div>

//             {/* Enhanced Progress Indicators */}
//             {(scraping || scrapingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-blue-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-emerald-800">Enhanced Scraping Progress</span>
//                         <span className="text-sm font-bold text-emerald-800">{scrapingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${scrapingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <p className="text-sm text-blue-700 font-medium bg-white p-2 rounded-lg">{currentStep}</p>
//                     )}
//                 </div>
//             )}

//             {(rewriting || rewritingProgress > 0) && (
//                 <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
//                     <div className="flex items-center justify-between">
//                         <span className="text-sm font-semibold text-green-700">Rewriting Progress</span>
//                         <span className="text-sm font-bold text-green-700">{rewritingProgress}%</span>
//                     </div>
//                     <div className="w-full bg-green-200 rounded-full h-4 shadow-inner">
//                         <div 
//                             className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
//                             style={{ width: `${rewritingProgress}%` }}
//                         >
//                             <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Error Display */}
//             {error && (
//                 <div className="p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
//                     <div className="flex items-start">
//                         <span className="text-red-500 mr-3 text-lg">⚠️</span>
//                         <span className="text-sm text-red-700 leading-relaxed">{error}</span>
//                     </div>
//                 </div>
//             )}

//             {/* Scraped Content Display */}
//             {scrapedContent && (
//                 <div className="space-y-4 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             Scraped Content 
//                             <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
//                                 Enhanced Extraction
//                             </span>
//                         </h3>
//                         <div className="flex gap-2 flex-wrap">
//                             <button
//                                 onClick={() => copyToClipboard(scrapedContent)}
//                                 className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
//                             >
//                                 Copy
//                             </button>
//                             {!autoRewrite && (
//                                 <button
//                                     onClick={() => handleRewriteContent()}
//                                     disabled={rewriting}
//                                     className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors font-medium"
//                                 >
//                                     {rewriting ? 'Rewriting...' : 'Rewrite'}
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                     <div className="max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 custom-scrollbar">
//                         <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
//                             {scrapedContent.length > 1000 
//                                 ? `${scrapedContent.substring(0, 1000)}...` 
//                                 : scrapedContent
//                             }
//                         </div>
//                     </div>
//                     <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
//                         📊 {scrapedContent.split(' ').length.toLocaleString()} words • {scrapedContent.length.toLocaleString()} characters
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Rewritten Content Display with Rich Styling */}
//             {rewrittenContent && (
//                 <div className="space-y-4 border border-green-200 rounded-xl p-6 bg-gradient-to-br from-white to-green-50 shadow-lg">
//                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//                         <h3 className="text-xl font-bold text-gray-800 flex items-center">
//                             AI Rewritten Content 
//                             <span className="ml-3 text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full font-semibold shadow-sm">
//                                 100% Unique & Humanized
//                             </span>
//                         </h3>
//                         <button
//                             onClick={() => copyToClipboard(rewrittenContent)}
//                             className="absolute top-3 right-3 text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium shadow-sm"
//                         >
//                             Copy Content
//                         </button>
//                     </div>
                    
//                     {/* Rich styled content container */}
//                     <div className="bg-white p-6 rounded-xl border border-green-200 shadow-inner custom-scrollbar">
//                         <div className="prose prose-sm sm:prose max-w-none">
//                             {parseResponse(rewrittenContent)}  {/* Render markdown content */}
//                         </div>
//                     </div>
                    
//                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-100">
//                         <div className="flex items-center gap-4">
//                             <span>📝 {rewrittenContent.split(' ').length.toLocaleString()} words</span>
//                             <span>📄 {rewrittenContent.length.toLocaleString()} characters</span>
//                         </div>
//                         <div className="flex items-center text-green-600">
//                             <span className="animate-pulse">✨</span>
//                             <span className="ml-1 font-medium">AI Enhanced Content</span>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Enhanced Real-time Status Display */}
//             {(scraping || rewriting) && (
//                 <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm z-50">
//                     <div className="flex items-center">
//                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
//                         <div className="text-sm font-medium">
//                             {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
//                             {rewriting && <span className="text-green-600">Creating unique content...</span>}
//                         </div>
//                     </div>
//                     {currentStep && (
//                         <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-lg">{currentStep}</div>
//                     )}
//                 </div>
//             )}

//             {/* Custom Scrollbar Styles */}
//             <style jsx>{`
//                 .custom-scrollbar::-webkit-scrollbar {
//                     width: 8px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-track {
//                     background: #f1f5f9;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb {
//                     background: #cbd5e1;
//                     border-radius: 4px;
//                 }
//                 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//                     background: #94a3b8;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default Scrap;


























import React, { useState, useRef } from 'react';
import axios from 'axios';
import { parseResponse } from '../../../util/parseresponse'; // Import parseResponse function

class URLContentMemory {
    constructor() {
        this.urlCache = new Map();
        this.maxCacheSize = 30;
        this.maxContentSize = 8 * 1024 * 1024; // 8MB max per URL content
    }

    store(url, data, metadata = {}) {
        if (this.urlCache.size >= this.maxCacheSize) {
            const firstKey = this.urlCache.keys().next().value;
            this.urlCache.delete(firstKey);
        }

        const contentData = {
            content: data,
            metadata: {
                ...metadata,
                timestamp: Date.now(),
                size: new Blob([data]).size,
                url: url
            }
        };

        this.urlCache.set(url, contentData);
        return url;
    }

    get(url) {
        return this.urlCache.get(url);
    }

    has(url) {
        return this.urlCache.has(url);
    }

    clear() {
        this.urlCache.clear();
    }

    getStats() {
        let totalSize = 0;
        this.urlCache.forEach(content => {
            totalSize += content.metadata.size || 0;
        });

        return {
            urlsCount: this.urlCache.size,
            totalSize: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    }
}

const Scrap = ({ onContentGenerated }) => {
    const getApiBaseUrl = () => {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env.VITE_API_BASE_URL;
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
        }
        return null;
    };

    const apiBaseUrl = getApiBaseUrl();

    const [url, setUrl] = useState('');
    const [scrapedContent, setScrapedContent] = useState('');
    const [rewrittenContent, setRewrittenContent] = useState('');
    const [scraping, setScraping] = useState(false);
    const [rewriting, setRewriting] = useState(false);
    const [scrapingProgress, setScrapingProgress] = useState(0);
    const [rewritingProgress, setRewritingProgress] = useState(0);
    const [urlStats, setUrlStats] = useState(null);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState('');
    const [autoRewrite, setAutoRewrite] = useState(true);

    const urlMemory = useRef(new URLContentMemory());

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const proxyServices = [
        {
            name: 'ThingProxy',
            url: (targetUrl) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
            extractContent: (response) => response.data
        },
        {
            name: 'CORS.sh',
            url: (targetUrl) => `https://cors.sh/${targetUrl}`,
            extractContent: (response) => response.data
        },
        {
            name: 'Proxy6 CORS',
            url: (targetUrl) => `https://proxy6.workers.dev/?url=${targetUrl}`,
            extractContent: (response) => response.data
        }
    ];

    const isValidUrl = (string) => {
        try {
            const urlObj = new URL(string);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (_) {
            return false;
        }
    };

    const normalizeUrl = (inputUrl) => {
        let cleanUrl = inputUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        return cleanUrl;
    };

    const extractTextFromHTML = (html) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const unwantedSelectors = [
                'script', 'style', 'nav', 'footer', 'header', 'aside',
                '.advertisement', '.ads', '.social', '.comments',
                '.sidebar', '.menu', '.navigation', '.breadcrumb',
                '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
            ];

            unwantedSelectors.forEach(selector => {
                const elements = doc.querySelectorAll(selector);
                elements.forEach(element => element.remove());
            });

            const contentSelectors = [
                'article',
                'main',
                '[role="main"]',
                '.content',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.post',
                '.article',
                '#content',
                '.container',
                '.wrapper',
                'body'
            ];

            let extractedText = '';
            let bestMatch = null;
            let maxLength = 0;

            for (const selector of contentSelectors) {
                const elements = doc.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || '';
                    if (text.length > maxLength) {
                        maxLength = text.length;
                        bestMatch = text;
                    }
                }
                if (bestMatch && maxLength > 500) break;
            }

            extractedText = bestMatch || doc.body?.textContent || '';

            const cleanedText = extractedText
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .replace(/[\r\n\t]+/g, '\n')
                .replace(/\u00A0/g, ' ')
                .trim();

            return cleanedText;
        } catch (error) {
            throw new Error(`HTML parsing failed: ${error.message}`);
        }
    };

    const fetchWithEnhancedProxy = async (targetUrl, maxRetries = 3) => {
        let lastError = null;

        for (let proxyIndex = 0; proxyIndex < proxyServices.length; proxyIndex++) {
            const proxy = proxyServices[proxyIndex];

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    setCurrentStep(`Trying ${proxy.name} (attempt ${attempt}/${maxRetries})...`);

                    const requestConfig = {
                        timeout: 45000,
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            ...proxy.headers
                        }
                    };

                    const response = await axios.get(proxy.url(targetUrl), requestConfig);
                    const content = proxy.extractContent(response);

                    if (!content || content.length < 100) {
                        throw new Error('Insufficient content received');
                    }

                    return { data: content };

                } catch (error) {
                    lastError = error;
                    const isLastAttempt = attempt === maxRetries;
                    const isLastProxy = proxyIndex === proxyServices.length - 1;

                    if (!isLastAttempt || !isLastProxy) {
                        const retryDelay = Math.min(2000 * attempt, 10000);
                        setCurrentStep(`${proxy.name} failed, retrying in ${retryDelay / 1000}s...`);
                        await sleep(retryDelay);
                    }
                }
            }
        }

        try {
            setCurrentStep('Trying direct fetch as last resort...');
            const response = await axios.get(targetUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return { data: response.data };
        } catch (directError) {
            throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }
    };

    const handleScrapeUrl = async () => {
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        const normalizedUrl = normalizeUrl(url);

        if (!isValidUrl(normalizedUrl)) {
            setError('Please enter a valid URL');
            return;
        }

        setScraping(true);
        setError('');
        setScrapedContent('');
        setRewrittenContent('');
        setScrapingProgress(0);
        setCurrentStep('Initializing enhanced scraper...');

        try {
            if (urlMemory.current.has(normalizedUrl)) {
                setCurrentStep('Loading from cache...');
                setScrapingProgress(50);
                const cachedData = urlMemory.current.get(normalizedUrl);
                setScrapedContent(cachedData.content);
                setScrapingProgress(100);
                setCurrentStep('Content loaded from cache');

                if (autoRewrite && cachedData.content.trim()) {
                    await handleRewriteContent(cachedData.content);
                }
                return;
            }

            setCurrentStep('Starting multi-proxy fetch...');
            setScrapingProgress(10);

            const response = await fetchWithEnhancedProxy(normalizedUrl);

            setCurrentStep('Analyzing and parsing content...');
            setScrapingProgress(60);

            await sleep(1000);

            const extractedText = extractTextFromHTML(response.data);

            if (!extractedText.trim() || extractedText.length < 50) {
                throw new Error('No meaningful content found. The page might be heavily JavaScript-dependent or protected.');
            }

            setCurrentStep('Processing and storing content...');
            setScrapingProgress(80);

            const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Title';

            const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

            urlMemory.current.store(normalizedUrl, extractedText, {
                title: title,
                scrapedAt: new Date().toISOString(),
                wordCount: wordCount,
                characterCount: extractedText.length,
                domain: new URL(normalizedUrl).hostname
            });

            setScrapedContent(extractedText);
            setUrlStats(urlMemory.current.getStats());
            setScrapingProgress(100);
            setCurrentStep(`Successfully scraped ${wordCount.toLocaleString()} words`);

            if (autoRewrite) {
                await sleep(1500);
                await handleRewriteContent(extractedText);
            }

        } catch (error) {
            console.error('Enhanced scraping error:', error);
            setError(`Scraping failed: ${error.message}`);
            setCurrentStep('');
            if (error.message.includes('timeout')) {
                setError(error.message + ' - The website might be slow or blocking requests.');
            } else if (error.message.includes('Network Error')) {
                setError('Network error - Check your internet connection or try a different URL.');
            }
        } finally {
            setScraping(false);
            setTimeout(() => {
                setScrapingProgress(0);
                if (!error) setCurrentStep('');
            }, 3000);
        }
    };

    const handleRewriteContent = async (content = scrapedContent) => {
        if (!content?.trim()) {
            setError('No content to rewrite');
            return;
        }

        if (!apiBaseUrl) {
            setError(`API base URL not configured. Please check your environment variables.`);
            return;
        }

        setRewriting(true);
        setRewritingProgress(0);
        setError('');

        try {
            setRewritingProgress(25);

            // Updated prompt to make sure AI only returns the rewritten content with no explanations
            const rewritePrompt = `Rewrite the following content into 100% unique, humanized content. Do not include any explanations or introductory phrases. Just output the clean, rewritten content without additional comments or text. Ensure it reads naturally and is well-structured for readability.

Original content to rewrite:
${content}`;

            setRewritingProgress(50);

            const response = await axios.post(
                `${apiBaseUrl}/rewrite`,
                {
                    input: rewritePrompt,
                    action: "Write a humanized, 100% unique content without explanations"
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            setRewritingProgress(90);

            if (response.data && response.data.modifiedText) {
                // Directly set the rewritten content (no need to clean it further)
                setRewrittenContent(response.data.modifiedText);

                if (onContentGenerated) {
                    onContentGenerated({
                        originalUrl: url,
                        scrapedContent: content,
                        rewrittenContent: response.data.modifiedText,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                throw new Error('No rewritten content received from API');
            }

            setRewritingProgress(100);

        } catch (error) {
            console.error('Rewriting error:', error);
            if (error.message.includes('Network Error') || error.message.includes('connect')) {
                setError(`Cannot connect to API server at ${apiBaseUrl}. Please check if the server is running.`);
            } else {
                setError(`Rewriting failed: ${error.message}`);
            }
        } finally {
            setRewriting(false);
            setTimeout(() => setRewritingProgress(0), 3000);
        }
    };

    const clearCache = () => {
        urlMemory.current.clear();
        setScrapedContent('');
        setRewrittenContent('');
        setUrlStats(null);
        setError('');
    };

    const copyToClipboard = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            {/* Enhanced Cache Stats */}
            {urlStats && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="text-sm text-green-700">
                            <span className="font-semibold">Enhanced Cache:</span> {urlStats.urlsCount} URLs, {urlStats.totalSizeMB}MB used
                        </div>
                        <button
                            onClick={clearCache}
                            className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium self-start sm:self-auto"
                        >
                            Clear Cache
                        </button>
                    </div>
                </div>
            )}

            {/* URL Input Section */}
            <div className="space-y-4">
                <div>

                    <label htmlFor="url-input" className="block mb-3 text-neutral-700  text-xl font-thin">
                        Website URL (Enhanced Multi-Proxy Scraper)
                    </label>

                    <label  className="block mb-3 text-neutral-400  text-sm font-extralight bg-slate-50 shadow-sm p-3 rounded-lg border border-gray-200">
                    Enter any website URL — the tool will extract the text content, rewrite it in a natural, human-like style, and make it 100% unique!
                    </label>


                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            id="url-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 text-xl rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-cyan-700 p-3 transition-all duration-200"
                            onKeyPress={(e) => e.key === 'Enter' && !scraping && handleScrapeUrl()}
                        />
                        <button
                            onClick={handleScrapeUrl}
                            disabled={scraping || !url.trim()}
                            className="px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                        >
                            {scraping ? 'Scraping...' : 'Scrape'}
                        </button>
                    </div>
                    <p className="from-neutral-content text-neutral-500 text-xs font-sans mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        🚀 Enhanced with {proxyServices.length} proxy services, retry logic, and intelligent content extraction
                    </p>
                </div>

                {/* Auto-rewrite toggle */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                        type="checkbox"
                        id="auto-rewrite"
                        checked={autoRewrite}
                        onChange={(e) => setAutoRewrite(e.target.checked)}
                        className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="auto-rewrite" className="text-sm text-gray-700 font-medium">
                        Automatically rewrite content after scraping
                    </label>
                </div>
            </div>

            {/* Enhanced Progress Indicators */}
            {(scraping || scrapingProgress > 0) && (
                <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-emerald-800">Enhanced Scraping Progress</span>
                        <span className="text-sm font-bold text-emerald-800">{scrapingProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
                            style={{ width: `${scrapingProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                    </div>
                    {currentStep && (
                        <p className="text-sm text-blue-700 font-medium bg-white p-2 rounded-lg">{currentStep}</p>
                    )}
                </div>
            )}

            {(rewriting || rewritingProgress > 0) && (
                <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-700">Rewriting Progress</span>
                        <span className="text-sm font-bold text-green-700">{rewritingProgress}%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-4 shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
                            style={{ width: `${rewritingProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
                    <div className="flex items-start">
                        <span className="text-red-500 mr-3 text-lg">⚠️</span>
                        <span className="text-sm text-red-700 leading-relaxed">{error}</span>
                    </div>
                </div>
            )}

            {/* Scraped Content Display */}
            {scrapedContent && (
                <div className="space-y-4 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center">
                            Scraped Content 
                            <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                                Enhanced Extraction
                            </span>
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => copyToClipboard(scrapedContent)}
                                className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Copy
                            </button>
                            {!autoRewrite && (
                                <button
                                    onClick={() => handleRewriteContent()}
                                    disabled={rewriting}
                                    className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {rewriting ? 'Rewriting...' : 'Rewrite'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 custom-scrollbar">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {scrapedContent.length > 1000 
                                ? `${scrapedContent.substring(0, 1000)}...` 
                                : scrapedContent
                            }
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                        📊 {scrapedContent.split(' ').length.toLocaleString()} words • {scrapedContent.length.toLocaleString()} characters
                    </div>
                </div>
            )}

            {/* Enhanced Rewritten Content Display with Rich Styling */}
            {rewrittenContent && (
                <div className="space-y-4 border border-green-200 rounded-xl p-6 bg-gradient-to-br from-white to-green-50 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center">
                            AI Rewritten Content 
                            <span className="ml-3 text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full font-semibold shadow-sm">
                                100% Unique & Humanized
                            </span>
                        </h3>
                        <button
                            onClick={() => copyToClipboard(rewrittenContent)}
                            className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium shadow-sm"
                        >
                            Copy Content
                        </button>
                    </div>
                    
                    {/* Rich styled content container */}
                    <div className="bg-white p-6 rounded-xl border border-green-200 shadow-inner custom-scrollbar">
                        <div className="prose prose-sm sm:prose max-w-none">
                            {parseResponse(rewrittenContent)}  {/* Render markdown content */}
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-100">
                        <div className="flex items-center gap-4">
                            <span>📝 {rewrittenContent.split(' ').length.toLocaleString()} words</span>
                            <span>📄 {rewrittenContent.length.toLocaleString()} characters</span>
                        </div>
                        <div className="flex items-center text-green-600">
                            <span className="animate-pulse">✨</span>
                            <span className="ml-1 font-medium">AI Enhanced Content</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Real-time Status Display */}
            {(scraping || rewriting) && (
                <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm z-50">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                        <div className="text-sm font-medium">
                            {scraping && <span className="text-blue-600">Enhanced scraping in progress...</span>}
                            {rewriting && <span className="text-green-600">Creating unique content...</span>}
                        </div>
                    </div>
                    {currentStep && (
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-lg">{currentStep}</div>
                    )}
                </div>
            )}

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default Scrap;