-- Create a function to get stays with privacy enforcement at the database level
-- This returns anonymized data for users who don't have visibility access
CREATE OR REPLACE FUNCTION public.get_stays_with_privacy(
  _village_id text,
  _viewer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  village_id text,
  nickname text,
  villa text,
  start_date date,
  end_date date,
  intention text,
  social_profile text,
  offerings text,
  asks text,
  secret_hash text,
  is_host boolean,
  created_at timestamptz,
  project_description text,
  project_url text,
  status text,
  user_id uuid,
  is_anon boolean,
  is_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.village_id,
    -- Anonymize nickname if not visible
    CASE 
      WHEN (
        -- Owner can always see their own data
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        -- Village hosts can see all data
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        -- If user has linked profile that is not anon, show data
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        -- Mutual connection grants visibility
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        -- Approved reveal request grants visibility
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.nickname
      ELSE 'Anonymous'
    END AS nickname,
    s.villa,
    s.start_date,
    s.end_date,
    -- Anonymize other sensitive fields
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.intention
      ELSE NULL
    END AS intention,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.social_profile
      ELSE NULL
    END AS social_profile,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.offerings
      ELSE NULL
    END AS offerings,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.asks
      ELSE NULL
    END AS asks,
    s.secret_hash,
    s.is_host,
    s.created_at,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.project_description
      ELSE NULL
    END AS project_description,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
        )
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      )
      THEN s.project_url
      ELSE NULL
    END AS project_url,
    s.status,
    -- Only expose user_id to owners and hosts for management purposes
    CASE 
      WHEN (s.user_id IS NOT NULL AND s.user_id = _viewer_id)
        OR (_viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id))
      THEN s.user_id
      ELSE NULL
    END AS user_id,
    -- is_anon from profile (default true)
    COALESCE(
      (SELECT p.is_anon FROM profiles p WHERE p.user_id = s.user_id),
      true
    ) AS is_anon,
    -- is_visible flag for client-side UI hints
    (
      (s.user_id IS NOT NULL AND s.user_id = _viewer_id) OR
      (_viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)) OR
      (s.user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = s.user_id AND p.is_anon = false
      )) OR
      (s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)) OR
      (s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id))
    ) AS is_visible
  FROM stays s
  WHERE s.village_id = _village_id
  ORDER BY s.start_date ASC;
END;
$$;