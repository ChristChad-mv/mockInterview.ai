"""
MockInterview.ai — Company Culture Tool
A tool to retrieve specific company culture information for a given company name.
"""

from ..app_utils.data.company_cultures import COMPANY_CULTURES



def get_entreprise_culture(company_name: str) -> str:
    """
    Retrieves the culture, values, and interview focus for a given company.
    
    Args:
        company_name (str): The name or alias of the company (e.g., 'Google', 'FB', 'Amazon').
        
    Returns:
        str: A formatted string containing the company's culture summary, values, and interview focus.
             If the company is not found, returns a message indicating that.
    """
    search_term = company_name.lower().strip()
    
    result = None
    for company in COMPANY_CULTURES:
        if search_term == company["name"].lower() or search_term in company["aliases"]:
            result = company
            break
            
    if not result:
        # Fallback search: check for partial matches
        for company in COMPANY_CULTURES:
            if search_term in company["name"].lower():
                result = company
                break
                
    if result:
        culture_str = f"--- {result['name']} Culture & Values ---\n"
        culture_str += f"Summary: {result['culture_summary']}\n\n"
        culture_str += "Core Values/Principles:\n"
        for value in result["values"]:
            culture_str += f"- {value}\n"
        culture_str += f"\nInterview Focus: {result['interview_focus']}\n"
        return culture_str
    
    return f"I don't have detailed culture information for '{company_name}'. Please proceed with general high-level behavioral interview best practices (STAR method, leadership, conflict resolution)."

if __name__ == "__main__":
    # Test
    print(get_entreprise_culture("Google"))
    print(get_entreprise_culture("Amazon"))
    print(get_entreprise_culture("Meta"))
    print(get_entreprise_culture("unknown"))
