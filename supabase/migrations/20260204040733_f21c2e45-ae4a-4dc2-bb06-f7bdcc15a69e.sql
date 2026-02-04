-- Create table for village application questions
CREATE TABLE public.village_application_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id text NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text', -- 'text', 'textarea', 'select', 'checkbox'
  options text[] DEFAULT '{}', -- for select/checkbox types
  is_required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for application answers (linked to stays)
CREATE TABLE public.stay_application_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.village_application_questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(stay_id, question_id)
);

-- Enable RLS
ALTER TABLE public.village_application_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_application_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for village_application_questions
CREATE POLICY "Anyone can view village questions"
ON public.village_application_questions
FOR SELECT
USING (true);

CREATE POLICY "Hosts can insert questions"
ON public.village_application_questions
FOR INSERT
WITH CHECK (is_village_host(auth.uid(), village_id));

CREATE POLICY "Hosts can update questions"
ON public.village_application_questions
FOR UPDATE
USING (is_village_host(auth.uid(), village_id));

CREATE POLICY "Hosts can delete questions"
ON public.village_application_questions
FOR DELETE
USING (is_village_host(auth.uid(), village_id));

-- RLS policies for stay_application_answers
CREATE POLICY "Anyone can view answers"
ON public.stay_application_answers
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert answers"
ON public.stay_application_answers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Stay owners or hosts can update answers"
ON public.stay_application_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM stays s
    WHERE s.id = stay_application_answers.stay_id
    AND (s.user_id = auth.uid() OR is_village_host(auth.uid(), s.village_id))
  )
);

-- Create trigger for updated_at on questions
CREATE TRIGGER update_village_application_questions_updated_at
BEFORE UPDATE ON public.village_application_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();