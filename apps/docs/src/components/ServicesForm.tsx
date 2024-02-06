import React, { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormLabel,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FORM_SERVER_HOST = import.meta.env.PUBLIC_FORM_SERVER_HOST;

interface ValidationError {
  name?: string;
  email?: string;
  message?: string;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email("Email must be valid."),
  message: z.string(),
  company: z.string().optional(),
});

export function ServicesForm() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError>();

  const form = useForm<z.infer<typeof formSchema>>({
    // resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      email: "",
      message: "",
      company: undefined,
    },
  });

  function submitForm(submissionEvent: z.infer<typeof formSchema>) {
    console.log({ submissionEvent });

    const result = formSchema.safeParse(submissionEvent);

    if (!result.success) {
      console.log({ result }, result.error);
      const newError: ValidationError = {};

      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          newError[error.path[0] as keyof ValidationError] = error.message;
        }
      });

      setValidationError(newError);
    } else {
      // actually submit the form to the server
      setFormSubmitted(true);
      fetch(`${FORM_SERVER_HOST}/marketing/services/contact`, {
        method: "POST",
        body: JSON.stringify(submissionEvent),
      });
    }
  }

  if (formSubmitted) {
    return (
      <p className="min-h-[10rem]">
        Thank you for the submission. We will reach out to you as soon as
        possible.
      </p>
    );
  }

  return (
    <Form {...form}>
      {/* <p>
        You can submit this form to contact us or you can reach out via{" "}
        <a href={DISCORD_INVITE_LINK}>Discord</a>.
      </p> */}
      <form onSubmit={form.handleSubmit(submitForm)} className="space-y-4">
        <div className="flex gap-4">
          <div className="w-1/2">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={"Arthur Dent"}
                      {...field}
                      onInput={(e) => {
                        form.setValue("name", e.currentTarget.value);
                      }}
                    />
                  </FormControl>
                  {validationError?.name && (
                    <FormMessage>{validationError.name}</FormMessage>
                  )}
                </FormItem>
              )}
            />
          </div>
          <div className="w-1/2">
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={"you@company.com"}
                      {...field}
                      onInput={(e) => {
                        form.setValue("email", e.currentTarget.value);
                      }}
                    />
                  </FormControl>
                  {validationError?.email && (
                    <FormMessage>{validationError.email}</FormMessage>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>
        <div>
          <FormField
            name="message"
            render={(field) => (
              <FormItem>
                <FormLabel>Message (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Let us know what you need."
                    {...field}
                    onInput={(e) =>
                      form.setValue("message", e.currentTarget.value)
                    }
                  />
                </FormControl>
                {validationError?.email && (
                  <FormMessage>{validationError.email}</FormMessage>
                )}
              </FormItem>
            )}
          />
        </div>

        <div className="hidden">
          <FormField
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="company"
                    placeholder={"you@company.com"}
                    {...field}
                    onInput={(e) => {
                      form.setValue("company", e.currentTarget.value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-end justify-end">
          <Button
            className="inline-flex text-white bg-primary-500 border-0 py-2 px-6 hover:bg-primary-600 rounded text-lg"
            type="submit"
          >
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
