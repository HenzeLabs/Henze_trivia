"""
Utility functions for mapping sender IDs (phone numbers, emails) to human-readable names.
"""

# Define your contact mappings here
# Format: phone number/email -> display name
CONTACT_MAPPING = {
    # Lauren (You)
    "+18645065892": "Lauren",
    "8645065892": "Lauren",
    
    # Benny Harris
    "+18034976579": "Benny Harris",
    "8034976579": "Benny Harris",
    
    # Gina Ortiz
    "+19109295033": "Gina Ortiz",
    "9109295033": "Gina Ortiz",
    
    # Ian O'Malley
    "+14046410104": "Ian O'Malley",
    "4046410104": "Ian O'Malley",
    
    # Jackson
    "+14782784676": "Jackson",
    "4782784676": "Jackson",
    
    # Additional numbers from chat extraction
    "+17702313752": "Ian O'Malley",  # Alternative Ian number
    "7702313752": "Ian O'Malley",
    "+14042779131": "Ian O'Malley",  # Another Ian number
    "4042779131": "Ian O'Malley",
    
    # Add more contacts as needed:
    # "+1XXXXXXXXXX": "Name",
    # "email@domain.com": "Name",
}


def get_name_from_sender(sender_id: str) -> str:
    """
    Convert a sender ID (phone number or email) to a human-readable name.
    
    Args:
        sender_id (str): The phone number or email address from the chat database
        
    Returns:
        str: The mapped name if found, otherwise returns the sender_id unchanged
        
    Examples:
        >>> get_name_from_sender("+15551234567")
        'Alice Johnson'
        
        >>> get_name_from_sender("unknown@email.com")
        'unknown@email.com'
    """
    if not sender_id:
        return "Unknown Sender"
    
    # Try exact match first
    if sender_id in CONTACT_MAPPING:
        return CONTACT_MAPPING[sender_id]
    
    # Try normalized phone number (remove spaces, dashes, parentheses)
    normalized = normalize_phone_number(sender_id)
    if normalized in CONTACT_MAPPING:
        return CONTACT_MAPPING[normalized]
    
    # Try without country code
    if sender_id.startswith("+1") and len(sender_id) > 2:
        local_number = sender_id[2:]
        if local_number in CONTACT_MAPPING:
            return CONTACT_MAPPING[local_number]
    
    # If no mapping found, return original sender_id
    return sender_id


def normalize_phone_number(phone: str) -> str:
    """
    Normalize a phone number by removing common formatting characters.
    
    Args:
        phone (str): Phone number in any format
        
    Returns:
        str: Normalized phone number (digits only, with + prefix if present)
        
    Examples:
        >>> normalize_phone_number("+1 (555) 123-4567")
        '+15551234567'
        
        >>> normalize_phone_number("555-123-4567")
        '5551234567'
    """
    if not phone:
        return phone
    
    # Keep leading + if present
    has_plus = phone.startswith("+")
    
    # Remove all non-digit characters
    digits_only = "".join(c for c in phone if c.isdigit())
    
    # Re-add + if it was present
    return f"+{digits_only}" if has_plus else digits_only


def add_contact_mapping(sender_id: str, name: str) -> None:
    """
    Dynamically add a new contact mapping at runtime.
    
    Args:
        sender_id (str): Phone number or email
        name (str): Display name for this contact
    """
    CONTACT_MAPPING[sender_id] = name


def get_all_mappings() -> dict:
    """
    Get all current contact mappings.
    
    Returns:
        dict: Copy of the contact mapping dictionary
    """
    return CONTACT_MAPPING.copy()
