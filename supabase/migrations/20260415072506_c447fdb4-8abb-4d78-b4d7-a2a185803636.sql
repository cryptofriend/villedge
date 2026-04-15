
CREATE OR REPLACE FUNCTION public.get_stays_with_privacy(_village_id text, _viewer_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, village_id text, nickname text, villa text, start_date date, end_date date, intention text, social_profile text, offerings text, asks text, secret_hash text, is_host boolean, created_at timestamp with time zone, project_description text, project_url text, status text, user_id uuid, is_anon boolean, is_visible boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.village_id,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        -- Co-residents: viewer has confirmed stay in same village
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
      )
      THEN s.nickname
      ELSE 'Anonymous'
    END AS nickname,
    s.villa,
    s.start_date,
    s.end_date,
    CASE 
      WHEN (
        s.user_id IS NOT NULL AND s.user_id = _viewer_id
      ) OR (
        _viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
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
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
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
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
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
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
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
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
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
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)
      ) OR (
        s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)
      ) OR (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
      )
      THEN s.project_url
      ELSE NULL
    END AS project_url,
    s.status,
    CASE 
      WHEN (s.user_id IS NOT NULL AND s.user_id = _viewer_id)
        OR (_viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id))
      THEN s.user_id
      ELSE NULL
    END AS user_id,
    true AS is_anon,
    (
      (s.user_id IS NOT NULL AND s.user_id = _viewer_id) OR
      (_viewer_id IS NOT NULL AND is_village_host(_viewer_id, s.village_id)) OR
      (s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_mutual_connection(_viewer_id, s.user_id)) OR
      (s.user_id IS NOT NULL AND _viewer_id IS NOT NULL AND has_approved_reveal(_viewer_id, s.user_id)) OR
      (
        _viewer_id IS NOT NULL AND s.status = 'confirmed' AND EXISTS (
          SELECT 1 FROM stays vs 
          WHERE vs.village_id = s.village_id 
            AND vs.user_id = _viewer_id 
            AND vs.status = 'confirmed'
        )
      )
    ) AS is_visible
  FROM stays s
  WHERE s.village_id = _village_id
  ORDER BY s.start_date ASC;
END;
$function$;
