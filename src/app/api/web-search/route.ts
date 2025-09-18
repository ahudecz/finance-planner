import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }

    // Mock web search results for demo purposes
    // In a real implementation, you would integrate with a search API like Google Custom Search, Bing, etc.
    const mockResults = generateMockSearchResults(query);

    return NextResponse.json({
      success: true,
      results: mockResults,
      query: query
    });
  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function generateMockSearchResults(query: string): any[] {
  const companyName = query.split(' ')[0];
  
  // Generate realistic mock data based on common company names
  const mockCompanyData: Record<string, any> = {
    'microsoft': {
      employees: '220,000 employees',
      revenue: '$211.9 billion revenue',
      country: 'United States',
      description: 'Technology corporation'
    },
    'google': {
      employees: '174,000 employees',
      revenue: '$282.8 billion revenue',
      country: 'United States',
      description: 'Technology company'
    },
    'apple': {
      employees: '164,000 employees',
      revenue: '$394.3 billion revenue',
      country: 'United States',
      description: 'Technology company'
    },
    'amazon': {
      employees: '1,541,000 employees',
      revenue: '$513.9 billion revenue',
      country: 'United States',
      description: 'E-commerce and cloud computing company'
    },
    'diageo': {
      employees: '28,000 employees',
      revenue: '$15.8 billion revenue',
      country: 'United Kingdom',
      description: 'Alcoholic beverages company'
    }
  };

  const lowerCompanyName = companyName.toLowerCase();
  const companyData = mockCompanyData[lowerCompanyName];

  if (companyData) {
    return [
      {
        title: `${companyName} - Company Overview`,
        snippet: `${companyName} is a leading ${companyData.description} based in ${companyData.country}. The company has ${companyData.employees} and generates ${companyData.revenue} annually.`,
        url: `https://www.${lowerCompanyName}.com/about`,
        content: `${companyName} Company Information: Employees: ${companyData.employees}, Annual Revenue: ${companyData.revenue}, Headquarters: ${companyData.country}`
      },
      {
        title: `${companyName} Financial Information`,
        snippet: `Financial overview of ${companyName} showing ${companyData.revenue} in annual revenue with a workforce of ${companyData.employees}.`,
        url: `https://finance.yahoo.com/${lowerCompanyName}`,
        content: `${companyName} employs ${companyData.employees} globally and reported ${companyData.revenue} in the last fiscal year.`
      }
    ];
  }

  // Generic fallback for unknown companies
  return [
    {
      title: `${companyName} - Company Information`,
      snippet: `${companyName} company information and business details.`,
      url: `https://www.${lowerCompanyName}.com`,
      content: `${companyName} is a company. Additional information may be available on their official website.`
    }
  ];
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Web Search API is running',
    description: 'Provides web search functionality for company enrichment'
  });
}

