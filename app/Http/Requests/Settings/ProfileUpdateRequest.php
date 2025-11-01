<?php

namespace App\Http\Requests\Settings;

use Illuminate\Validation\Rule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Resolve the currently authenticated actor across guards
        $actor = $this->user() ?? $this->user('customer') ?? $this->user('technician') ?? $this->user('admin');

        // Determine the table to validate email uniqueness against
        $emailTable = 'users';
        if ($this->user('customer')) {
            $emailTable = 'customers';
        } elseif ($this->user('technician')) {
            $emailTable = 'technicians';
        } elseif ($this->user('admin')) {
            $emailTable = 'admins';
        }

        return [
            // Support both unified name and split names used in UI
            'name' => ['nullable', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique($emailTable, 'email')->ignore($actor?->id),
            ],
        ];
    }
}
